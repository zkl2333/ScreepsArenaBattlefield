import {
  RESOURCE_ENERGY,
  OK,
  ERR_NOT_IN_RANGE,
  ERR_NOT_ENOUGH_RESOURCES,
  ERR_FULL,
} from "game/constants";
import { findClosestByPath } from "game/utils";
import { CreepBehavior } from "./CreepBehavior.mjs";

/**
 * 采集者行为类
 */
export class HarvesterBehavior extends CreepBehavior {
  run() {
    // 采集者的逻辑
    this.harvestEnergy();
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
}
