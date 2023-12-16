import { StructureSpawn } from "game/prototypes";
import { CREEP_ROLE, CREEP_ROLE_BODY_PARTS, bodyPartCosts } from "../constants.mjs";
import { getTicks } from "game/utils";
import { ERR_NOT_ENOUGH_ENERGY } from "game/constants";

/**
 * @typedef {CREEP_ROLE[keyof CREEP_ROLE]} CREEP_ROLE_VALUE
 * @typedef {{role: CREEP_ROLE_VALUE, level: Number}} CreepConfig
 */

/**
 * SpawnManager 用于管理 Spawn 的生成队列
 */
export class SpawnManager {
  /**
   * @param {StructureSpawn} spawn
   */
  constructor(spawn) {
    this.spawn = spawn;
    /**
     * @type {Array<CreepConfig>} 生成队列
     */
    this.queue = [];
  }

  /**
   * 将 Creep 加入生成队列
   * @param {CreepConfig} creepConfig
   */
  enqueue(creepConfig) {
    this.queue.push(creepConfig);
  }

  update() {
    if (this.spawn.spawning) {
      // 如果当前正在生成Creep，则不执行任何操作
      return;
    }

    if (this.queue.length > 0) {
      console.log(
        "SpawnManager queue",
        this.queue.map((creepConfig) => creepConfig.role).join(",")
      );
      // 获取队列中的下一个Creep 并从队列中移除
      const nextCreep = this.queue.shift();
      this.spawnCreep(nextCreep);
    }
  }

  creatBodyParts(creepConfig) {
    const creepBody = [];
    for (let i = 0; i < creepConfig.level; i++) {
      creepBody.push(...CREEP_ROLE_BODY_PARTS[creepConfig.role]);
    }
    return creepBody;
  }

  /**
   * 生成 Creep
   * @param {CreepConfig} creepConfig
   */
  spawnCreep(creepConfig) {
    const creepBody = CREEP_ROLE_BODY_PARTS[creepConfig.role];
    if (!creepBody) {
      console.log(`SpawnManager.spawnCreep: 未知的角色 ${creepConfig.role}`);
      return;
    }

    const spawnResult = this.spawn.spawnCreep(this.creatBodyParts(creepConfig));
    const creep = spawnResult.object;
    const error = spawnResult.error;
    if (error) {
      switch (error) {
        case ERR_NOT_ENOUGH_ENERGY:
          return;
        default:
          console.log(`SpawnManager.spawnCreep: 生成失败 ${error}`);
          return;
      }
    }
    if (creep) {
      creep.memory = {
        role: creepConfig.role,
        level: creepConfig.level,
        name: `${creepConfig.role}-${getTicks()}`,
      };
      console.log(`SpawnManager.spawnCreep: 生成 ${creep.memory.name} 成功`);
    }
  }

  /**
   * 获取队列中指定角色的数量
   * @param {CREEP_ROLE_VALUE} creepRole
   */
  getQueueCount(creepRole) {
    return this.queue.filter((creepConfig) => creepConfig.role === creepRole).length;
  }

  /**
   * 计算 Creep 的花费
   * @param {CreepConfig} creepConfig
   */
  calculateCreepCost(creepConfig) {
    return this.creatBodyParts(creepConfig).reduce((cost, bodyPart) => {
      return cost + bodyPartCosts[bodyPart];
    }, 0);
  }
}
