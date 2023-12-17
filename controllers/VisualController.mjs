import { Visual } from "game/visual";
import { StructureSpawn, Creep } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";
import { CREEP_STATE } from "../constants.mjs";

const groupIdColorMap = {};

export class VisualController {
  draw() {
    this.visual = new Visual();
    this.drawSpawns();
    this.drawCreeps();
    // 在这里添加更多的绘制函数调用
  }

  drawSpawns() {
    // 绘制所有 Spawn 的可视化
    const spawns = getObjectsByPrototype(StructureSpawn);
    for (const spawn of spawns) {
      this.visual.circle(
        { x: spawn.x, y: spawn.y },
        {
          radius: 1,
          fill: spawn.my ? "green" : "red",
          opacity: 0.5,
        }
      );
    }
  }

  drawCreeps() {
    // 绘制所有 Creep 的可视化
    const creeps = getObjectsByPrototype(Creep);

    for (const creep of creeps) {
      if (creep.memory) {
        const color = this.getCreepColor(creep);
        const opacity = this.getCreepOpacity(creep);
        if (color) {
          this.visual.circle(
            { x: creep.x, y: creep.y },
            {
              radius: 0.5,
              fill: color,
              opacity: opacity,
            }
          );
        }
      }
    }
  }

  /**
   * 根据 groupId 返回不同的颜色
   * @param {String} groupId
   * @returns {String} 颜色
   */
  getColorByGroupId(groupId) {
    // 根据 groupId 返回不同的颜色
    const colors = [
      "red",
      "green",
      "blue",
      "yellow",
      "orange",
      "purple",
      "cyan",
      "magenta",
      "lightgreen",
      "pink",
      "lightblue",
      "lightcyan",
      "grey",
      "lightgrey",
      "brown",
    ];
    // 如果已经有了颜色，则直接返回
    if (groupIdColorMap[groupId]) {
      return groupIdColorMap[groupId];
    }
    // 如果没有颜色，则随机一个
    const color = colors[Math.floor(Math.random() * colors.length)];
    // 并将其存入缓存
    groupIdColorMap[groupId] = color;
    return color;
  }

  getCreepColor(creep) {
    // 同一个小队 ID 的 Creep 会有相同的颜色
    if (creep.memory.groupId) {
      return this.getColorByGroupId(creep.memory.groupId);
    }
    if (creep.memory.state === CREEP_STATE.GATHERING) {
      return "#216535";
    }
    if (creep.memory.state === CREEP_STATE.ATTACKING) {
      return "#652121";
    }
    return null;
  }

  getCreepOpacity(creep) {
    // 根据 Creep 的特定属性返回不同的透明度
    if (creep.memory.isLeader) {
      return 0.8;
    } else {
      return 0.5;
    }
  }
}
