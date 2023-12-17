import { HEAL, ATTACK, RANGED_ATTACK, OK, CARRY, MOVE } from "game/constants";
import { Creep, GameObject, StructureSpawn } from "game/prototypes";
import { CREEP_ROLE, CREEP_STATE } from "../constants.mjs";
import { CreepBehavior } from "./CreepBehavior.mjs";
import { getDirection, getObjectById, getTicks } from "game/utils";
import { REQUIRED_SOLDIERS_COUNT } from "../config.mjs";

/**
 * 士兵行为基类
 */
export class SoldierBehavior extends CreepBehavior {
  run() {
    this.beforeRun();

    this.members = this.getMembers();
    this.checkAndSwitchState();

    switch (this.creep.memory.state) {
      case CREEP_STATE.GATHERING:
        this.moveToRallyPoint();
        return;
      case CREEP_STATE.ATTACKING:
        this.performAttack();
        return;
      case CREEP_STATE.GUARDING:
        this.guard();
        return;
      default:
        this.moveToRallyPoint();
        return;
    }
  }

  getMembers() {
    return this.battleController.myCreeps.filter(
      (creep) => this.creep.memory.groupId && creep.memory.groupId === this.creep.memory.groupId
    );
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

  checkAndSwitchState() {
    // 如果是小队，则切换进攻状态
    if (this.creep.memory.groupId) {
      this.creep.memory.state = CREEP_STATE.ATTACKING;
      return;
    }

    const enemiesInRange = this.creep.findInRange(this.battleController.enemies, 3);
    if (enemiesInRange.length > 0) {
      this.creep.memory.state = CREEP_STATE.ATTACKING;
    } else {
      this.creep.memory.state = CREEP_STATE.GATHERING;
    }
  }

  // 守家
  guard() {
    // 攻击基地周围的敌人
    const target = this.creep.findClosestByPath(this.battleController.enemies);
    this.attackTarget(target);
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
    const groupLeader = this.members.find((creep) => creep.memory.isLeader);
    // 如果没有队长，我就是队长
    if (!groupLeader) {
      console.log(this.creep.memory.name, this.creep.memory.groupId, "没有队长，我就是队长");
      this.creep.memory.isLeader = true;
      return this.creep;
    }
    if (!groupLeader.exists) {
      console.log(this.creep.memory.name, this.creep.memory.groupId, "队长不存在，我就是队长");
      groupLeader.memory.isLeader = false;
      this.creep.memory.isLeader = true;
      return this.creep;
    }
    return groupLeader;
  }

  // 队伍检测
  checkGroup() {
    // 如果队伍人数不足
    if (this.members.length < REQUIRED_SOLDIERS_COUNT) {
      // 找到最近的队员
      const newMember = this.creep.findClosestByPath(
        this.battleController.myCreeps.filter(
          (creep) =>
            !creep.memory.groupId &&
            creep.memory.role === this.creep.memory.role &&
            this.creep.getRangeTo(creep) <= 10
        ) || []
      );

      // 如果有新队员，则征召新队员
      if (newMember) {
        console.log(this.creep.memory.name, "征召新队员", newMember.memory.name);
        newMember.memory.groupId = this.creep.memory.groupId;
        newMember.memory.state = CREEP_STATE.ATTACKING;
        this.members = this.getMembers();
        return this.checkGroup();
      }

      // 如果没有新队员，则解散队伍
      console.log(this.creep.memory.name, "没有新队员，解散队伍");
      this.members.forEach((creep) => {
        creep.memory.groupId = null;
        creep.memory.isLeader = false;
      });
      return false;
    }

    return true;
  }

  /**
   * 小队攻击逻辑
   * 如果当前 Creep 是队长，会决定攻击目标
   * 如果当前 Creep 不是队长，会攻击队长的攻击目标
   * 如果队长没有攻击目标，则跟随队长
   */
  attackAsGroup() {
    if (!this.checkGroup()) {
      // 返回集合点
      this.moveToRallyPoint();
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
      const targetInRange = target && target.exists && this.creep.getRangeTo(target) <= 5;

      if (targetInRange) {
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

    return this.creep.findClosestByPath(visibleEnemies);

    // // 有攻击者
    // const hasAttacker = visibleEnemies.some(
    //   (creep) =>
    //     creep instanceof Creep &&
    //     creep.body
    //       .filter((part) => part.type === ATTACK || part.type === RANGED_ATTACK)
    //       .some((part) => part.hits > 0)
    // );

    // // 为每个敌人分配优先级
    // const prioritizedTargets = visibleEnemies.map((enemy) => {
    //   let priority = 0;
    //   if (enemy instanceof StructureSpawn) {
    //     priority = 5;
    //   }
    //   if (enemy instanceof Creep) {
    //     if (enemy.body.some((part) => part.type === HEAL)) {
    //       if (hasAttacker) {
    //         return null;
    //       }
    //       priority += 3; // 医疗单位
    //     } else if (enemy.body.some((part) => part.type === ATTACK || part.type === RANGED_ATTACK)) {
    //       priority += 2; // 攻击单位
    //     } else if (enemy.body.some((part) => part.type === CARRY)) {
    //       priority += 5; // 采集单位
    //     }
    //   }
    //   const distance = this.creep.getRangeTo(enemy);

    //   // 距离权重基数
    //   const distanceWeight = 0.5;
    //   // move 部件数量
    //   const moveParts = this.creep.body.filter((part) => part.type === MOVE).length;
    //   // 距离权重
    //   priority += -(distance * distanceWeight * moveParts);

    //   return { enemy, priority };
    // });

    // // 按优先级排序并选择最高的
    // prioritizedTargets.filter(Boolean).sort((a, b) => b.priority - a.priority);
    // return prioritizedTargets[0].enemy;
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
    console.log(this.creep.memory.name, "返回集结点");
    this.creep.memory.state = CREEP_STATE.GATHERING;
    this.creep.moveTo(this.battleController.rallyPoint);
    this.healSelf();
    this.rangeHeal();
  }
}
