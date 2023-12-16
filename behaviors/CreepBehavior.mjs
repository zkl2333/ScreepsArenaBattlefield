import { Creep } from "game/prototypes";
import {
  RESOURCE_ENERGY,
  ERR_NOT_IN_RANGE,
  CARRY,
  ATTACK,
  RANGED_ATTACK,
  OK,
  ERR_FULL,
  ERR_NOT_ENOUGH_RESOURCES,
} from "game/constants";
import { findClosestByPath } from "game/utils";
import { BattleController } from "../controllers/BattleController.mjs";

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

  run() {
    if (this.creep.body.some((part) => part.type === CARRY)) {
      this.harvestEnergy();
      return;
    }

    if (this.creep.body.some((part) => part.type === ATTACK || part.type === RANGED_ATTACK)) {
      this.attackEnemies();
      return;
    }
  }

  // 收集能量的逻辑
  harvestEnergy() {
    if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      // 未满载时采集能量
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
            console.log("harvestEnergy", this.creep.id, "能量不足");
            break;
          default:
            console.log("harvestEnergy", this.creep.id, "采集异常结果", actionResult);
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
            console.log("harvestEnergy", this.creep.id, "能量不足");
            break;
          case ERR_FULL:
            console.log("harvestEnergy", this.creep.id, "基地能量已满");
            break;
          default:
            console.log("harvestEnergy", this.creep.id, "返回基地异常结果", actionResult);
            break;
        }
      } else {
        // 返回基地
        this.creep.moveTo(this.battleController.mainSpawn);
      }
    }
  }

  // 攻击敌人的逻辑
  attackEnemies() {
    console.log("run", this.creep.id, "攻击敌人");
    const enemies = [this.battleController.enemySpawn, ...this.battleController.enemies];
    if (enemies.length > 0) {
      const target = this.creep.findClosestByPath(enemies);
      console.log("attackEnemies", this.creep.id, "目标", target.id);
      if (!target) {
        console.log("attackEnemies", this.creep.id, "没有找到敌人");
        return; // 没有找到敌人
      }

      if (this.creep.body.some((part) => part.type === RANGED_ATTACK)) {
        // 进行远程攻击
        if (this.creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(target);
        }
      } else if (this.creep.body.some((part) => part.type === ATTACK)) {
        // 进行近战攻击
        if (this.creep.attack(target) === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(target);
        }
      }
    }
  }
}
