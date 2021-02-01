import { PokerFlower, PokerValue } from "./Model";
import $ from "jquery";
import { NetPoker } from "./NetInfos";
import Enumerable from "../lib/linq.js";
import anime from "animejs";

/** 单张扑克对象 */
class Poker {
  private onselect: boolean = false;
  /**牌值 */
  public value: PokerValue;
  /**牌花色 */
  public flower: PokerFlower;
  /**对应扑克ID */
  public elementID: string;
  /**绑定的扑克li元素 */
  public tagElement: HTMLLIElement;
  /**指示该牌是否是地主牌 */
  private isLandPK: boolean = false;

  get onSelect() {
    return this.onselect;
  }

  set onSelect(value: boolean) {
    if (value == this.onselect) return;
    this.onselect = value;
    anime({
      targets: this.tagElement,
      translateY: value ? -35 : 0,
      easing: "linear",
      duration: 200,
    });
  }

  get isLandPoker() {
    return this.isLandPK;
  }

  set isLandPoker(value: boolean) {
    this.isLandPK = value;
    if (value) {
      $(this.tagElement).addClass("dizuPk");
    } else {
      $(this.tagElement).removeClass("dizuPk");
    }
  }

  /**显示值 */
  get word() {
    var w = this.value.toString();
    switch (w) {
      case "11":
        w = "J";
        break;
      case "12":
        w = "Q";
        break;
      case "13":
        w = "K";
        break;
      case "14":
        w = "A";
        break;
      case "15":
        w = "2";
        break;
      case "16":
      case "17":
        w = "JOKER";
        break;
    }
    return w;
  }

  constructor(value: PokerValue, fw: PokerFlower = PokerFlower.spades) {
    if (value < 3 || value > 17) throw new Error("扑克牌不存在");
    this.value = value;
    this.flower = fw;
    if (value == 16) this.flower = PokerFlower.spades;
    if (value == 17) this.flower = PokerFlower.heart;
    this.elementID = PokerFlower[fw] + "-" + PokerValue[value];
    let tis = this;
    setPokerTagElement();
    function setPokerTagElement(): void {
      let doc = document;
      let li = doc.createElement("li");
      li.id = tis.elementID;
      var el: HTMLDivElement;

      if (tis.word != "JOKER") {
        li.innerHTML = `
        <div class="pk-box handpk">
        <div class="lef number">
            <div class="pk-value value">${tis.word}</div>
            <i class="iconfont icon-${PokerFlower[tis.flower]} flower_s"></i>
        </div>
        <div class="fwbox">
            <i class="iconfont icon-${PokerFlower[tis.flower]} flower_b"></i>
        </div>
        </div>
        `;
      } else {
        let src = tis.value == 16 ? "joker_s.png" : "joker_b.png";
        li.innerHTML = `
            <div class="pk-box handpk">
            <div class="lef">
                <div class="jk-value value" >${tis.word}</div>
            </div>
            <div class="fwbox">
            <img src="../static/img/${src}" width="62px" height="62px">
            </div>
            </div>
            `;
      }

      el = <HTMLDivElement>li.getElementsByClassName("value")[0];
      el.style.color = tis.flower == PokerFlower.clubs || tis.flower == PokerFlower.spades ? "black" : "red";
      tis.tagElement = li;
    }
  }

  /**将NetPoker转为Poker*/
  public static npksToPks(pks: NetPoker[]): Poker[] {
    if (!pks || pks.length == 0) return [];
    var res = Enumerable.from(pks)
      .select((pk) => {
        return new Poker(pk.Value, pk.Flower);
      })
      .toArray();
    return res;
  }

  /**将Poker转为NetPoker */
  public static pksToNpks(pks: Poker[]): NetPoker[] {
    return Enumerable.from(pks)
      .select(function (p) {
        return new NetPoker(p.value, p.flower);
      })
      .toArray();
  }

  public toString(): string {
    return this.elementID;
  }
}

export default Poker;
