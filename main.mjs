import { getTicks } from "game/utils";
import { BattleController } from "./controllers/BattleController.mjs";

// 主循环
const battleController = new BattleController();

export function loop() {
  console.log("main loop", getTicks());
  battleController.update();
}
