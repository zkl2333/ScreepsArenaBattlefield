import { Creep, StructureSpawn } from "game/prototypes";
import {
  RESOURCE_ENERGY,
  ERR_NOT_IN_RANGE,
  OK,
  ERR_FULL,
  ERR_NOT_ENOUGH_RESOURCES,
  ATTACK,
  HEAL,
  RANGED_ATTACK,
} from "game/constants";
import { findClosestByPath, getDirection, getObjectById } from "game/utils";
import { BattleController } from "../controllers/BattleController.mjs";
import { CREEP_ROLE, CREEP_STATE } from "../constants.mjs";
import { Position } from "../utils/Position.mjs";

/**
 * 代表游戏中 Creep 的行为
 */
export class CreepBehavior {
  /**
   * @param {Creep} creep
   * @param {BattleController} battleController
   */
  constructor(creep, battleController) {
    this.creep = creep;
    this.battleController = battleController;
  }

  /**
   * Creep 的主循环 会根据不同的角色执行不同的逻辑
   */
  run() {
    if (this.creep.fatigue > 0) {
      return;
    }

    if (!this.creep.memory) {
      return;
    }

    // 生成中的 Creep 不执行任何操作
    if (new Position(this.creep.x, this.creep.y).isEqualTo(this.battleController.mainSpawn)) {
      return;
    } else {
    }

    if (this.creep.memory.role === CREEP_ROLE.HARVESTER) {
      this.harvestEnergy();
      return;
    }

    if (
      this.creep.memory.role === CREEP_ROLE.ATTACKER ||
      this.creep.memory.role === CREEP_ROLE.RANGED_ATTACKER
    ) {
      if (this.creep.memory.state !== CREEP_STATE.ATTACKING) {
        // 敌人在视野内，则切换为攻击状态
        if (this.creep.findInRange(this.battleController.enemies, 30).length > 0) {
          this.creep.memory.state = CREEP_STATE.ATTACKING;
        }
      }
      // 根据小队状态执行不同逻辑
      if (this.creep.memory.state === CREEP_STATE.ATTACKING) {
        this.attackEnemies();
      } else {
        this.gatherForAttack();
      }
    }
  }

  /**
   * 采集能量的逻辑
   */
  harvestEnergy() {
    if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      // 未满载时收取能量
      const closestContainer = findClosestByPath(this.creep, this.battleController.containers);
      if (closestContainer) {
        const actionResult = this.creep.withdraw(closestContainer, RESOURCE_ENERGY);
        switch (actionResult) {
          case OK:
            break;
          case ERR_NOT_IN_RANGE:
            this.creep.moveTo(closestContainer);
            break;
          case ERR_NOT_ENOUGH_RESOURCES:
            console.log("harvestEnergy", this.creep.memory.name, "能量不足");
            break;
          default:
            console.log("harvestEnergy", this.creep.memory.name, "收取能量异常", actionResult);
            console.log(this.creep);
            break;
        }
      }
    } else {
      if (this.battleController.mainSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        // 满载后返回基地
        const actionResult = this.creep.transfer(this.battleController.mainSpawn, RESOURCE_ENERGY);
        switch (actionResult) {
          case OK:
            break;
          case ERR_NOT_IN_RANGE:
            this.creep.moveTo(this.battleController.mainSpawn);
            break;
          case ERR_NOT_ENOUGH_RESOURCES:
            console.log("harvestEnergy", this.creep.memory.name, "能量不足");
            break;
          case ERR_FULL:
            console.log("harvestEnergy", this.creep.memory.name, "基地能量已满");
            break;
          default:
            console.log("harvestEnergy", this.creep.memory.name, "返回基地异常结果", actionResult);
            break;
        }
      } else {
        // 返回基地
        this.creep.moveTo(this.battleController.mainSpawn);
      }
    }
  }

  /**
   * 集结逻辑
   */
  gatherForAttack() {
    // 移动到集结点
    this.creep.moveTo(this.battleController.rallyPoint);
  }

  /**
   * 攻击敌人的逻辑
   */
  attackEnemies() {
    if (this.creep.memory.groupId) {
      // 如果属于某个小队，则按照小队的行动
      this.attackEnemiesByGroup();
    } else {
      // 否则单独行动
      this.attackEnemiesAlone();
    }
  }

  attackTarget(target) {
    if (this.creep.memory.role === CREEP_ROLE.RANGED_ATTACKER) {
      // 如果敌人在攻击范围内，则移动到离敌人最远的位置
      const distance = this.creep.getRangeTo(target);
      if (target instanceof Creep) {
        if (target.body.some((part) => part.type === RANGED_ATTACK)) {
          if (distance < 2) {
            const direction = getDirection(this.creep.x - target.x, this.creep.y - target.y);
            this.creep.move(direction);
            return;
          }
        }
      }
      // 进行远程攻击
      if (this.creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(target);
      }
    } else if (this.creep.memory.role === CREEP_ROLE.ATTACKER) {
      // 进行近战攻击
      if (this.creep.attack(target) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(target);
      }
    }
  }

  attackEnemiesByGroup() {
    // 找到队员
    const groupMembers = this.battleController.myCreeps.filter(
      (creep) => creep.memory.groupId === this.creep.memory.groupId
    );

    // 找到队长
    let groupLeader = groupMembers.find((creep) => creep.memory.isLeader);

    if (!groupLeader) {
      // 如果没有队长，则选举队长
      const newLeader = groupMembers[0];
      // 选举队长
      newLeader.memory.isLeader = true;
      groupLeader = newLeader;
    }

    if (this.creep.memory.isLeader) {
      // 如果是队长，则行动
      this.attackEnemiesAlone();
    } else {
      // 如果不是队长，则跟随队长, 攻击目标与队长相同
      if (groupLeader) {
        const enemie = getObjectById(groupLeader.memory.targetId);
        // 敌人在视野内
        const isEnemieInSight = enemie?.exists && this.creep.findInRange([enemie], 5).length > 0;
        // 如果敌人在视野内，则攻击
        if (isEnemieInSight) {
          this.attackTarget(enemie);
        } else {
          this.creep.moveTo(groupLeader);
        }
      }
    }
  }

  // 查找优先攻击目标 根据相对距离和权重计算敌人的优先级
  findPriorityTarget(targets) {
    const priorityTargets = targets.map((target) => {
      const distance = this.creep.getRangeTo(target);
      let priority = 0;
      if (target instanceof StructureSpawn) {
        priority = 5;
      } else if (target instanceof Creep) {
        if (target.body.some((part) => part.type === HEAL)) {
          priority = 2;
        } else if (target.body.some((part) => part.type === ATTACK)) {
          priority = 1;
        } else if (target.body.some((part) => part.type === RANGED_ATTACK)) {
          priority = 1;
        }
      }
      priority = priority - distance * 0.5;
      return { target, priority, distance };
    });
    priorityTargets.sort((a, b) => {
      return b.priority - a.priority;
    });
    return priorityTargets[0].target;
  }

  attackEnemiesAlone() {
    const enemies = [this.battleController.enemySpawn, ...this.battleController.enemies];
    if (enemies.length > 0) {
      const target = this.findPriorityTarget(enemies);
      console.log("attackEnemies", this.creep.memory.name, "目标", target.id);
      if (!target) {
        console.log("attackEnemies", this.creep.memory.name, "没有找到敌人");
        return; // 没有找到敌人
      }
      this.creep.memory.targetId = target.id;
      this.attackTarget(target);
    }
  }
}
