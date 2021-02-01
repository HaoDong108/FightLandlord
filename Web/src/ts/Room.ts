import Player from "./Player";

class Room {
  roomid: number;
  title: string;
  btscore: string;
  players: Player[];
  master: Player;
  tagElement: Element;

  constructor() {}
}
