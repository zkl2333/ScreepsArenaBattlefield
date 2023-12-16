import { StructureSpawn, Creep, StructureContainer } from "game/prototypes";
import { RESOURCE_ENERGY } from "game/constants";
import { getObjectsByPrototype, getTicks } from "game/utils";
import { CreepBehavior } from "../behaviors/CreepBehavior.mjs";
import { SpawnManager } from "./SpawnManager.mjs";
import { CREEP_ROLE, CREEP_STATE } from "../constants.mjs";
import { NEED_WORKER_COUNT } from "../config.mjs";
import { Position } from "../utils/Position.mjs";

/**
 * 战斗控制器
 */
export class BattleController {
  constructor() {
    this.mainSpawn = this.getMainSpawn();
    this.enemySpawn = this.getEnemieSpawns();
    this.spawnManager = new SpawnManager(this.mainSpawn);
    // 设置集结点
    this.rallyPoint = this.determineRallyPoint();
    this.setGlobalData();
  }

  /**
   * 设置全局数据
   */
  setGlobalData() {
    this.containers = this.getContainers();
    this.myCreeps = getObjectsByPrototype(Creep).filter((creep) => creep.my);
    this.enemies = getObjectsByPrototype(Creep).filter((creep) => !creep.my);
  }

  /**
   * 主循环
   */
  update() {
    this.setGlobalData();
    this.spawnWorkers();
    this.spawnSoldier();
    // 更新 SpawnManager
    this.spawnManager.update();
    // 更新是否准备好进攻的状态
    this.updateReadyToAttack();
    // 分配 Creep 的行为
    this.assignCreepBehavior();
  }

  /**
   * 确定集结点位置
   */
  determineRallyPoint() {
    const x = this.mainSpawn.x;
    const y = this.mainSpawn.y;

    if (x < 50) {
      // 出生点在左边
      return new Position(x + 5, y);
    } else {
      // 出生点在右边
      return new Position(x - 5, y);
    }
  }

  /**
   * 更新是否准备好进攻
   */
  updateReadyToAttack() {
    const requiredSoldiers = 6; // 需要的士兵数量

    // 获取无编队的士兵
    const soldiersAtRallyPoint = this.myCreeps.filter(
      (creep) =>
        (creep.memory.role === CREEP_ROLE.ATTACKER ||
          creep.memory.role === CREEP_ROLE.RANGED_ATTACKER) &&
        !creep.memory.groupId &&
        this.rallyPoint.isInRange(creep)
    );

    // 准备状态
    const readyToAttack = soldiersAtRallyPoint.length >= requiredSoldiers;

    // 如果准备好了，就将士兵分组
    if (readyToAttack) {
      soldiersAtRallyPoint.forEach((creep) => {
        creep.memory.groupId = getTicks();
        creep.memory.state = CREEP_STATE.ATTACKING;
      });
    }
  }

  /**
   * 获取我方 Spawn
   */
  getMainSpawn() {
    return getObjectsByPrototype(StructureSpawn).find((spawn) => spawn.my);
  }

  /**
   * 获取敌方 Spawn
   * @returns {StructureSpawn}
   */
  getEnemieSpawns() {
    return getObjectsByPrototype(StructureSpawn).find((spawn) => !spawn.my);
  }

  /**
   * 获取所有的 Container
   * @returns {Array<StructureContainer>}
   */
  getContainers() {
    return getObjectsByPrototype(StructureContainer).filter((container) => {
      return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    });
  }

  /**
   * 获取指定角色的 Creep 数量
   * @param {CREEP_ROLE[keyof CREEP_ROLE]} role
   * @returns {Number}
   */
  getAllCreepsCountByRole(role) {
    const spawningCreeps = this.spawnManager.getQueueCount(role);
    const currentCreeps = this.myCreeps.filter((creep) => creep.memory?.role === role).length;
    return spawningCreeps + currentCreeps;
  }

  /**
   * 生成工人
   */
  spawnWorkers() {
    const workerConfig = {
      role: CREEP_ROLE.HARVESTER,
      level: 1,
    };
    const count = this.getAllCreepsCountByRole(workerConfig.role);
    if (count < NEED_WORKER_COUNT) {
      if (this.mainSpawn && !this.mainSpawn.spawning) {
        this.spawnManager.enqueue(workerConfig);
      }
    }
  }

  /**
   * 生成士兵
   */
  spawnSoldier() {
    // 士兵的配置
    const rangedAttacker = this.getAllCreepsCountByRole(CREEP_ROLE.RANGED_ATTACKER);
    const attacker = this.getAllCreepsCountByRole(CREEP_ROLE.ATTACKER);
    const soldierConfig = {
      role: rangedAttacker < attacker ? CREEP_ROLE.RANGED_ATTACKER : CREEP_ROLE.ATTACKER,
      level: 1,
    };
    // 士兵的成本
    const soldierCost = this.spawnManager.calculateCreepCost(soldierConfig);
    // 是否有敌人
    const hasEnemies = this.enemies.length > 0 || !!this.enemySpawn;
    // 是否有足够的能量
    const hasEnergy = this.mainSpawn.store.getUsedCapacity(RESOURCE_ENERGY) > soldierCost;
    // 士兵的数量
    const soldierCount = rangedAttacker + attacker;
    const shouldSpawn = hasEnemies && soldierCount < 20 && hasEnergy;
    if (shouldSpawn) {
      this.spawnManager.enqueue(soldierConfig);
    }
  }

  /**
   * 分配 Creep 的行为
   */
  assignCreepBehavior() {
    this.myCreeps.forEach((creep) => {
      const behavior = new CreepBehavior(creep, this);
      behavior.run();
    });
  }
}
