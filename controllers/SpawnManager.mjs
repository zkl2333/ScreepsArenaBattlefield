import { StructureSpawn } from "game/prototypes";

/**
 * SpawnManager 用于管理 Spawn 的生成队列
 */
export class SpawnManager {
  /**
   * @param {StructureSpawn} spawn
   */
  constructor(spawn) {
    this.spawn = spawn;
    this.queue = [];
  }

  /**
   * 将 Creep 加入生成队列
   * @param {Array<any>} creepBody
   */
  enqueue(creepBody) {
    this.queue.push(creepBody);
  }

  update() {
    console.log("SpawnManager queue", JSON.stringify(this.queue));
    if (this.spawn.spawning) {
      return; // 如果当前正在生成Creep，则不执行任何操作
    }

    if (this.queue.length > 0) {
      const nextCreepBody = this.queue.shift(); // 获取队列中的下一个Creep
      this.spawn.spawnCreep(nextCreepBody);
    }
  }

  /**
   * 获取队列中指定身体构成的数量
   * @param {String} creepBodyPart
   */
  getQueueCount(creepBodyPart) {
    return this.queue.filter((creepBody) => creepBody.includes(creepBodyPart)).length;
  }
}
