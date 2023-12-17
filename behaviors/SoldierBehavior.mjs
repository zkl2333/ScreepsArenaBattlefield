import { HEAL, ATTACK, RANGED_ATTACK, OK, CARRY, MOVE } from "game/constants";
import { Creep, GameObject, StructureSpawn } from "game/prototypes";
import { CREEP_STATE } from "../constants.mjs";
import { CreepBehavior } from "./CreepBehavior.mjs";
import { getObjectById, getTicks } from "game/utils";

/**
 * 士兵行为基类
 */
export class SoldierBehavior extends CreepBehavior {
  run() {
    this.beforeRun();
    if (this.creep.memory.state !== CREEP_STATE.ATTACKING) {
      this.checkAndSwitchToAttackState();
    }

    if (this.creep.memory.state === CREEP_STATE.ATTACKING) {
      this.performAttack();
    } else {
      this.moveToRallyPoint();
    }
  }

  beforeRun() {
    throw new Error("beforeRun 方法需要在子类中实现");
  }

  // 治疗自己
  healSelf() {
    if (this.creep.hits < this.creep.hitsMax) {
      const healSelfResult = this.creep.heal(this.creep);
      switch (healSelfResult) {
        case OK:
          break;
        default:
          console.log("healSelf", this.creep.memory.name, "治疗自己异常", healSelfResult);
          break;
      }
    }
  }

  // 治疗队友
  rangeHeal() {
    const target = this.creep.findClosestByRange(
      this.battleController.myCreeps.filter((creep) => creep.hits < creep.hitsMax)
    );
    if (target) {
      this.creep.rangedHeal(target);
    }
  }

  checkAndSwitchToAttackState() {
    // 检查周围是否有敌人
    const enemiesInRange = this.creep.findInRange(this.battleController.enemies, 30);
    if (enemiesInRange.length > 0) {
      this.creep.memory.state = CREEP_STATE.ATTACKING;
    }
  }

  performAttack() {
    // 如果属于小队，则按小队协调攻击
    if (this.creep.memory.groupId) {
      this.attackAsGroup();
    } else {
      this.attackIndividually();
    }
  }

  // 查找队长
  findLeader() {
    const groupLeader = this.battleController.myCreeps.find((creep) => creep.memory.isLeader);
    // 如果没有队长，我就是队长
    if (!groupLeader) {
      this.creep.memory.isLeader = true;
      return this.creep;
    }
    if (!groupLeader.exists) {
      groupLeader.memory.isLeader = false;
      this.creep.memory.isLeader = true;
      return this.creep;
    }
    return groupLeader;
  }

  /**
   * 小队攻击逻辑
   * 如果当前 Creep 是队长，会决定攻击目标
   * 如果当前 Creep 不是队长，会攻击队长的攻击目标
   * 如果队长没有攻击目标，则跟随队长
   */
  attackAsGroup() {
    const members = this.battleController.myCreeps.filter(
      (creep) => creep.memory.groupId === this.creep.memory.groupId
    );

    // 如果队伍人数不足，则解散队伍
    if (members.length < 2) {
      this.creep.memory.groupId = null;
      this.creep.memory.isLeader = false;

      // 查找最近的小队
      const closestGroup = this.battleController.myCreeps
        .filter((creep) => creep.memory.groupId && creep.memory.role === this.creep.memory.role)
        .sort((a, b) => this.creep.getRangeTo(a) - this.creep.getRangeTo(b))[0];

      // 如果有小队，则加入小队
      if (closestGroup) {
        this.creep.memory.groupId = closestGroup.memory.groupId;
      }
      return;
    }

    // 找到队长
    const groupLeader = this.findLeader();

    // 如果是队长，决定攻击目标
    if (this.creep.memory.isLeader) {
      const priorityTarget = this.findPriorityTarget();
      if (priorityTarget) {
        this.creep.memory.targetId = priorityTarget.id;
        this.attackTarget(priorityTarget);
      } else {
        this.creep.memory.targetId = null;
      }
    } else {
      // 如果不是队长，攻击队长的攻击目标
      const target = getObjectById(groupLeader.memory.targetId);
      if (target && target.exists) {
        this.attackTarget(target);
      } else {
        this.followLeader(groupLeader);
      }
    }
  }

  // 执行个体攻击逻辑
  attackIndividually() {
    const target = this.findClosestEnemy();
    if (!target) {
      this.moveToRallyPoint();
    } else {
      this.attackTarget(target);
    }
  }

  /**
   * 跟随队长的逻辑
   * @param {Creep} groupLeader
   */
  followLeader(groupLeader) {
    this.creep.moveTo(groupLeader);
  }

  /**
   * 获取可见的敌人
   * @returns {Array<StructureSpawn | Creep>}
   */
  getVisibleEnemies() {
    return [this.battleController.enemySpawn, ...this.battleController.enemies];
  }

  findPriorityTarget() {
    const visibleEnemies = this.getVisibleEnemies();
    if (!visibleEnemies.length) return null;

    // 有攻击者
    const hasAttacker = visibleEnemies.some(
      (creep) =>
        creep instanceof Creep &&
        creep.body
          .filter((part) => part.type === ATTACK || part.type === RANGED_ATTACK)
          .some((part) => part.hits > 0)
    );

    // 为每个敌人分配优先级
    const prioritizedTargets = visibleEnemies.map((enemy) => {
      let priority = 0;
      if (enemy instanceof StructureSpawn) {
        priority = 5;
      }
      if (enemy instanceof Creep) {
        if (enemy.body.some((part) => part.type === HEAL)) {
          if (hasAttacker) {
            return null;
          }
          priority += 3; // 医疗单位
        } else if (enemy.body.some((part) => part.type === ATTACK || part.type === RANGED_ATTACK)) {
          priority += 2; // 攻击单位
        } else if (enemy.body.some((part) => part.type === CARRY)) {
          priority += 5; // 采集单位
        }
      }
      const distance = this.creep.getRangeTo(enemy);

      // 距离权重基数
      const distanceWeight = 0.5;
      // move 部件数量
      const moveParts = this.creep.body.filter((part) => part.type === MOVE).length;
      // 距离权重
      priority += -(distance * distanceWeight * moveParts);

      return { enemy, priority };
    });

    // 按优先级排序并选择最高的
    prioritizedTargets.filter(Boolean).sort((a, b) => b.priority - a.priority);
    return prioritizedTargets[0].enemy;
  }

  /**
   * @param {GameObject} _target
   */
  attackTarget(_target) {
    throw new Error("attackTarget 方法需要在子类中实现");
  }

  findClosestEnemy() {
    return this.creep.findClosestByRange(this.getVisibleEnemies());
  }

  moveToRallyPoint() {
    this.creep.moveTo(this.battleController.rallyPoint);
  }
}
