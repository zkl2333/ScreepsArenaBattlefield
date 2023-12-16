import { StructureSpawn, Creep, StructureContainer } from "game/prototypes";
import {
  MOVE,
  CARRY,
  ATTACK,
  RESOURCE_ENERGY,
  RANGED_ATTACK,
  TOUGH,
  HEAL,
  WORK,
} from "game/constants";
import { getObjectsByPrototype, getTicks } from "game/utils";
import { CreepBehavior } from "../behaviors/CreepBehavior.mjs";
import { SpawnManager } from "./SpawnManager.mjs";

const bodyPartCosts = {
  [MOVE]: 50,
  [WORK]: 100,
  [CARRY]: 50,
  [ATTACK]: 80,
  [RANGED_ATTACK]: 150,
  [HEAL]: 250,
  [TOUGH]: 10,
};

const INITIAL_WORKER_COUNT = 3;

/**
 * 战斗控制器
 */
export class BattleController {
  constructor() {
    this.mainSpawn = this.getMainSpawn();
    this.enemySpawn = this.getEnemieSpawns();
    this.spawnManager = new SpawnManager(this.mainSpawn);
    this.setGlobalData();
  }

  setGlobalData() {
    this.containers = this.getContainers();
    this.myCreeps = getObjectsByPrototype(Creep)
      .filter((creep) => creep.my)
      .filter((creep) => creep.hits > 0);
    this.enemies = getObjectsByPrototype(Creep).filter((creep) => !creep.my);
  }

  update() {
    this.setGlobalData();
    this.assignCreepBehavior();
    this.spawnInitialWorkers();
    if (this.shouldSpawnSoldier()) {
      this.spawnManager.enqueue([RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE]);
    }
    this.spawnManager.update();
  }

  getMainSpawn() {
    return getObjectsByPrototype(StructureSpawn).find((spawn) => spawn.my);
  }

  getEnemieSpawns() {
    return getObjectsByPrototype(StructureSpawn).find((spawn) => !spawn.my);
  }

  getContainers() {
    return getObjectsByPrototype(StructureContainer).filter((container) => {
      return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    });
  }

  spawnInitialWorkers() {
    // 生产中的矿工
    const spawningWorkers = this.spawnManager.getQueueCount(CARRY);
    // 当前的矿工
    const currentWorkers = this.myCreeps.filter((creep) =>
      creep.body.some((part) => part.type === CARRY)
    ).length;
    // 如果当前的矿工数量小于初始数量，则生成矿工
    if (currentWorkers + spawningWorkers < INITIAL_WORKER_COUNT) {
      if (this.mainSpawn && !this.mainSpawn.spawning) {
        this.spawnManager.enqueue([MOVE, CARRY]);
      }
    }
  }

  // 判断是否应该制造士兵
  shouldSpawnSoldier() {
    // 士兵的身体构成
    const soldierBody = [MOVE, RANGED_ATTACK];
    // 士兵的成本
    const soldierCost = this.calculateCreepCost(soldierBody);
    // 士兵的数量
    const soldierCount = this.myCreeps.filter((creep) =>
      creep.body.some((part) => part.type === RANGED_ATTACK)
    ).length;
    // 生产中的士兵数量
    const queuedSoldierCount = this.spawnManager.getQueueCount(RANGED_ATTACK);
    // 是否有敌人
    const hasEnemies = this.enemies.length > 0 || !!this.enemySpawn;
    // 是否有足够的能量
    const hasEnergy = this.mainSpawn.store.getUsedCapacity(RESOURCE_ENERGY) > soldierCost;

    console.log("shouldSpawnSoldier", {
      是否有敌人: hasEnemies,
      士兵的数量: soldierCount,
      生产中的士兵数量: queuedSoldierCount,
      是否有足够的能量: hasEnergy,
    });

    return hasEnemies && soldierCount + queuedSoldierCount < 3 && hasEnergy;
  }

  calculateCreepCost(body) {
    return body.reduce((cost, part) => cost + bodyPartCosts[part], 0);
  }

  assignCreepBehavior() {
    console.log("assignCreepBehavior", getTicks());
    this.myCreeps.forEach((creep) => {
      const behavior = new CreepBehavior(creep, this);
      behavior.run();
    });
  }
}
