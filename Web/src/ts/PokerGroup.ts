import { OutType, PokerValue as PV, PokerFlower as PF, PokerValue, PokerFlower } from "./Model";
import Poker from "./Poker";
import Enumerable from "../lib/linq.js";
class PokerGroup {
  public _pkGroup: Poker[] = []; //当前牌组
  /**当前牌组牌型 */
  public outType: OutType; //当前牌型
  /**当前牌组权值 */
  private weight: number; //牌组权值

  /**获取降序排列的扑克牌组 */
  get pgDsc() {
    return this._pkGroup.slice(0).reverse();
  }

  /**获取升序排列的扑克牌组 */
  get pgAsc() {
    return this._pkGroup.slice(0);
  }

  /** 牌组长度 */
  get len() {
    return this._pkGroup.length;
  }

  /**新建扑克牌组,并在内部按升序排序 */
  constructor(pk: Poker[]) {
    var pk2 = pk.slice(0);
    if (pk2.length == 0) throw new Error("给定的扑克牌组不能为空");
    this._pkGroup = this.sortPokers(pk2);
    this.updateStae();
  }

  //返回拥有指定键值对的牌
  public getPk(value: PokerValue, flower: PokerFlower): Poker {
    let res = Enumerable.from(this._pkGroup)
      .where((e) => {
        return e.value == value && e.flower == flower;
      })
      .first();
    return res;
  }

  /**检测牌组类型 */
  public static checkOutType(pks: Poker[]): OutType {
    if (pks.length == 0) return OutType.Error_Card;
    return new PokerGroup(pks).outType;
  }

  /** 判断当前牌组能否压死目标牌组 */
  public biggerOf(hepk: Poker[]): boolean {
    let he = new PokerGroup(hepk);
    if (this.outType == OutType.Error_Card) return false;
    if (he.outType == OutType.Error_Card) return true;
    if (this.outType == OutType.王炸) return true; //我是王炸-赢
    if (he.outType == OutType.王炸) return false;
    if (this.outType == OutType.炸弹 && he.outType != OutType.炸弹) return true; //我是炸弹,对方不是-赢
    if (he.outType == OutType.炸弹 && this.outType != OutType.炸弹) return false;
    if (this.len != he.len) return false; //长度不一 -输
    if (this.outType !== he.outType) return false; //牌型不一-输
    return this.weight > he.weight; //最后比较权值
  }

  /**添加牌组到手牌*/
  public pushPokers(pks: Poker[]): void {
    var arr = this._pkGroup.concat(pks);
    arr = this.sortPokers(arr);
    this._pkGroup = arr;
    this.updateStae();
  }

  /**删除牌组中的指定扑克 */
  public removePoker(pk: Poker): boolean {
    let flg = false;
    this._pkGroup.forEach((p, i) => {
      if (p.elementID == pk.elementID) {
        p.tagElement.onmouseenter = null;
        p.tagElement.onmousedown = null;
        this._pkGroup.splice(i, 1);
        flg = true;
        this.updateStae();
        return;
      }
    });
    console.log("牌组剩余牌:" + this._pkGroup);
    return flg;
  }

  /**删除牌组中的一组牌,如果不存在改组则返回false*/
  public removePks(pks: Poker[]): boolean {
    if (!this.containGroups(pks)) return false;
    for (let i = 0; i < pks.length; i++) {
      this.removePoker(pks[i]);
    }
    return true;
  }

  /**
   * 判断是否包含该张扑克
   * @param ignoreFw 是否忽略花色
   */
  public contains(pk: Poker, ignoreFw: boolean = false): boolean {
    return this._pkGroup.some((p) => {
      return ignoreFw ? p.value == pk.value : p.elementID == pk.elementID;
    });
  }

  /**判断是否包含改组扑克 */
  public containGroups(pks: Poker[]): boolean {
    for (let i = 0; i < pks.length; i++) {
      if (!this.contains(pks[i])) return false;
    }
    return true;
  }

  /**更新牌堆属性 */
  private updateStae() {
    this.outType = this.cardTypeCheck();
    this.weight = this.reckonWeight();
  }

  /** 根据牌值和花色排序扑克牌堆 */
  public sortPokers(pkss: Poker[] = this._pkGroup, asc: boolean = true): Poker[] {
    var pks = pkss.slice(0);
    //根据值排序
    pks.sort((a, b) => {
      return asc ? a.value - b.value : b.value - a.value;
    });
    //获取所有值堆分组
    var arr: Array<Poker[]> = Enumerable.from(pks)
      .groupBy((p) => p.value)
      .select((ig, i) => {
        return ig.getSource();
      })
      .toArray();
    //依次将值堆按花色排序 并将其拼接到结果
    let res: Poker[] = [];
    arr.forEach((e) => {
      e.sort((a, b) => {
        return a.flower - b.flower;
      });
      res = res.concat(e);
    });
    return res;
  }

  /**判定手牌类型 */
  private cardTypeCheck(): OutType {
    var cardsArr = this._pkGroup.slice(0);
    if (!cardsArr || cardsArr.length < 1) {
      return OutType.Error_Card;
    }
    var cardType = OutType.Error_Card;
    var len = cardsArr.length;
    if (len === 1) {
      cardType = OutType.单;
    } else if (len === 2) {
      if (this.checkDouble(cardsArr)) {
        cardType = OutType.对子;
      } else if (this.checkKingBomb(cardsArr)) {
        cardType = OutType.王炸;
      }
    } else if (len === 3) {
      if (this.checkAllCardSame(cardsArr)) {
        cardType = OutType.三张;
      }
    } else if (len === 4) {
      if (this.checkAllCardSame(cardsArr)) {
        cardType = OutType.炸弹;
      } else if (this.checkThreeOne(cardsArr)) {
        cardType = OutType.三带一;
      }
    } else if (len === 5) {
      if (this.checkContinuousSingle(cardsArr)) {
        cardType = OutType.顺子;
      } else if (this.checkThreeOne(cardsArr)) {
        cardType = OutType.三带一对;
      }
    } else if (len === 6) {
      if (this.checkContinuousSingle(cardsArr)) {
        cardType = OutType.顺子;
      } else if (this.checkContinuousDouble(cardsArr)) {
        cardType = OutType.连对;
      } else if (this.checkAirplane(cardsArr)) {
        cardType = OutType.飞机;
      } else if (this.checkFourWithTwo(cardsArr)) {
        cardType = OutType.四带二;
      }
    } else {
      // 6 张以上需要判断单顺、双顺、飞机、飞机带翅膀、4带2
      if (this.checkContinuousSingle(cardsArr)) {
        cardType = OutType.顺子;
      } else if (this.checkContinuousDouble(cardsArr)) {
        cardType = OutType.连对;
      } else if (this.checkAirplane(cardsArr)) {
        cardType = OutType.飞机;
      } else if (this.checkAirplaneWithWing(cardsArr)) {
        cardType = OutType.飞机带翅膀;
      } else if (this.checkFourWithTwo(cardsArr)) {
        cardType = OutType.四带二;
      }
    }
    return cardType;
  }

  /**计算牌组权值大小 */
  private reckonWeight(): number {
    if (this.outType == OutType.Error_Card) return -1;
    //如果是王炸,毫无疑问最大
    if (this.outType === OutType.王炸) return 100;
    var poks = this.pgDsc;
    let size = 0;
    //如果是炸弹,则给出基数,后面再加上牌大小用于拼炸弹
    if (this.outType === OutType.炸弹) size = 20;
    //获取value值出现次数最多的牌值,以此表示为该牌组的基础权重
    let t: number[] = new Array<number>(20).fill(0);
    let v = poks[0].value;
    t[v] = 1;
    for (let i = 1; i < poks.length; i++) {
      let tv = ++t[poks[i].value];
      if (tv > t[v]) {
        v = poks[i].value;
      }
    }
    //如果牌型是飞机带翅膀且全部都为三张,则进行权值校验
    if (
      this.outType == OutType.飞机带翅膀 &&
      Enumerable.from(this.pgAsc)
        .groupBy((e) => e.value)
        .any((e) => e.getSource().length == 3)
    ) {
      if (!t[v - 1] && !t[v + 1]) {
        //判断当前t[v]是否有相邻三张,如果没有则说明将翅膀值记为了改组牌的权重
        //如果没有相邻三张则向前寻找前一组大小次于该权值的三张牌作为改组权值
        while (!t[--v]);
      }
    }
    size += v;
    return size;
  }

  //#region 牌型查找
  /**获取手中所有比指定牌大的组合 */
  public getBiggerOfGroups(last: PokerGroup): PokerGroup[] {
    let myPks = this.pgAsc; //我方手牌
    let myLen = myPks.length;
    let prevType = last.outType;
    let prevPks = last.pgAsc; //上家手牌
    let prevLen = prevPks.length;
    let ot = OutType;
    let res: PokerGroup[] = []; //返回值
    let tis = this;
    if (last.outType == OutType.王炸) return []; //如果对方是王炸直接GG
    if (this.biggerOf(last.pgAsc)) return [this]; //如果剩余手牌比对方大直接抬走
    if (getAllBoom().length == 0 && myLen < prevLen) return []; //如果我方没有炸弹且手牌数小于对方GG
    /**获取牌堆中该牌的数量 */
    function count(p: Poker) {
      return Enumerable.from(myPks).count((e) => {
        return e.value == p.value;
      });
    }
    /**获取所有 二/三/四 (每个值最多1次) */
    function getPgs(num: number): PokerGroup[] {
      var res = Enumerable.from(myPks)
        .where((p) => {
          return count(p) >= num && p.value < 16;
        })
        .groupBy((p) => p.value)
        .select((gr) => {
          return new PokerGroup(gr.getSource().slice(0, num));
        });
      return res.toArray();
    }
    /**获取所有炸弹 */
    function getAllBoom() {
      let res = getPgs(4);
      let wz = new PokerGroup(myPks.slice(myLen - 2, myLen));
      if (wz.outType == OutType.王炸) {
        res.push(wz);
      }
      return res;
    }
    /**将手牌添加到结果 */
    function push(pgs: PokerGroup[]) {
      if (pgs.length == 0) return;
      pgs.forEach((e) => res.push(e));
    }
    /**组合牌组 */
    function spliceGroupToArray(gr: PokerGroup[]) {
      let res: Poker[] = [];
      gr.forEach((e) => {
        res = res.concat(e.pgAsc);
      });
      return res;
    }
    if (myLen >= prevLen) {
      switch (prevType) {
        case ot.单: {
          let ds = Enumerable.from(myPks)
            .where((p) => p.value > prevPks[0].value)
            .select((p) => new PokerGroup([p]))
            .toArray();
          push(ds);
          break;
        }
        case ot.对子: {
          let ds = Enumerable.from(getPgs(2))
            .where((pg) => pg.biggerOf(prevPks))
            .toArray();
          push(ds);
          break;
        }
        case ot.三张: {
          let ds = Enumerable.from(getPgs(3))
            .where((pg) => pg.biggerOf(prevPks))
            .toArray();
          push(ds);
          break;
        }
        case ot.三带一: {
          let sac = getPgs(3);
          let ds = Enumerable.from(getPgs(3))
            .select((pg) => {
              //获取一张其他值单牌并添加到牌组中组成三带一
              let p = Enumerable.from(myPks).first((e) => e.value != pg.pgAsc[0].value);
              pg.pushPokers([p]);
              return pg;
              //筛选更大的牌
            })
            .where((w) => {
              return w.biggerOf(prevPks);
            })
            .toArray();
          push(ds);
          break;
        }
        case ot.三带一对: {
          let san = getPgs(3);
          let dui = getPgs(2);
          if (san.length == 0) break; //没有三张则跳出
          if (dui.length <= 1) break; //至少有两对
          let pks = Enumerable.from(san)
            .select((pg) => {
              //找出值与三张不同的一个对子
              let d = Enumerable.from(dui).first((e) => {
                return e.pgAsc[0].value != pg.pgAsc[0].value;
              });
              pg.pushPokers(d.pgAsc);
              return pg;
            })
            .where((r) => r.biggerOf(prevPks))
            .toArray();
          push(pks);
          break;
        }
        case ot.四带二: {
          let fr = getPgs(4);
          if (fr.length < 1) break;
          //四带两张
          if (prevLen == 6) {
            let fs = Enumerable.from(fr)
              .select((f) => {
                //给牌组添加两张任意其他单牌组成四带二
                let ds = Enumerable.from(myPks)
                  .where((e) => e.value != f.pgAsc[0].value)
                  .take(2)
                  .toArray();
                f.pushPokers(ds);
                return f;
              })
              .where((o) => o.biggerOf(prevPks))
              .toArray();
            push(fs);
          }
          //四带两对
          else {
            let dui = getPgs(2);
            if (dui.length < 3 && fr.length < 2) break; //如果手牌中的对子数小于3则无法组成四带2对
            let fs = Enumerable.from(fr)
              .select((f) => {
                //如果存在两个不相同的对子则优先选择
                if (dui.length >= 3) {
                  //获取所有的两对(不包括四张相同)
                  let rs = Enumerable.from(dui)
                    .where((d) => {
                      return f.pgAsc[0].value != d.pgAsc[0].value;
                    })
                    .take(2)
                    .toArray();
                  f.pushPokers(rs[0].pgAsc);
                  f.pushPokers(rs[1].pgAsc);
                  return f;
                } else {
                  let fo = Enumerable.from(getPgs(4)).first((fs) => {
                    return fs.pgAsc[0].value != f.pgAsc[0].value;
                  });
                  f.pushPokers(fo.pgAsc);
                  return f;
                }
              })
              .where((s) => s.biggerOf(prevPks))
              .toArray();
            push(fs);
          }
          break;
        }
        case ot.连对: {
          let res = Enumerable.from(getPgs(2))
            .where((e) => {
              let first = e.pgAsc[0];
              //对子的值应该大于对方牌组的最小值,且不能为2和王
              return first.value > prevPks[0].value && first.value < PokerValue.two;
            })
            .toArray();
          let plen = prevLen / 2;
          if (res.length < plen) break; //对子过少
          let rgs: PokerGroup[] = [];
          for (let i = 0; i + plen <= res.length; i++) {
            let gs = spliceGroupToArray(res.slice(i, i + plen)); //切取同等数量的对子
            //如果是连对则一定比对方大,添加到结果中
            if (tis.checkContinuousDouble(gs)) {
              rgs.push(new PokerGroup(gs));
            }
          }
          push(rgs);
          break;
        }
        case ot.顺子: {
          let res = Enumerable.from(myPks)
            .where((e) => {
              //单的值应该大于对方牌组的最小值,且不能为2和王
              return e.value > prevPks[0].value && e.value < PokerValue.two;
            })
            .groupBy((e) => e.value)
            .select((e) => e.getSource()[0])
            .toArray();
          if (res.length < prevLen) break; //可选牌过少
          let rgs: PokerGroup[] = [];
          for (let i = 0; i + prevLen <= res.length; i++) {
            let gs = res.slice(i, i + prevLen); //切取同等数量的单
            //如果是单顺则一定比对方大,添加到结果中
            if (tis.checkContinuousSingle(gs)) {
              rgs.push(new PokerGroup(gs));
            }
          }
          push(rgs);
          break;
        }
        case ot.飞机: {
          let res = Enumerable.from(getPgs(3))
            .where((e) => {
              let first = e.pgAsc[0];
              //飞机的值应该大于对方牌组的最小值,且不能为2和王
              return first.value > prevPks[0].value && first.value < PokerValue.two;
            })
            .toArray();
          let plen = prevLen / 3;
          if (res.length < plen) break; //三张过少
          let rgs: PokerGroup[] = [];
          for (let i = 0; i + plen <= res.length; i++) {
            let gs = spliceGroupToArray(res.slice(i, i + plen)); //切取同等数量的三张
            //如果是飞机则一定比对方大,添加到结果中
            if (tis.checkAirplane(gs)) {
              rgs.push(new PokerGroup(gs));
            }
          }
          push(rgs);
          break;
        }
        case ot.飞机带翅膀: {
          let ts = 0;
          //查询对方牌组中出所有的三张
          let trs = Enumerable.from(prevPks)
            .groupBy((e) => e.value)
            .where((e) => {
              let flg = e.getSource().length == 3;
              if (flg) ts += 3;
              return flg;
            })
            .select((e) => e.getSource())
            .toArray();
          //如果查询牌长度等于12则说明将一组三张作为了翅膀,需要进行剔除
          //牌组为升序 单组不是在头就是在尾部,所以判断头部两组是否相邻即可
          if (ts == 12) trs.splice(trs[0][0].value + 1 != trs[1][0].value ? 0 : 3, 1);
          //查询出我方牌组中的所有比对方最小值大的三张
          let mtrs = Enumerable.from(getPgs(3))
            .where((e) => e.pgAsc[0].value > trs[0][0].value)
            .toArray();
          //查询出我方所有比对方牌组大的飞机
          let rgs: PokerGroup[] = [];
          for (let i = 0; i + trs.length <= mtrs.length; i++) {
            let gs = spliceGroupToArray(mtrs.slice(i, i + trs.length)); //切取同等数量的三张
            //如果是飞机则一定比对方大,添加到结果中
            if (tis.checkAirplane(gs)) {
              rgs.push(new PokerGroup(gs));
            }
          }
          if (rgs.length < 1) break; //飞机不够
          //检索分组中是否包含有对子,如果有则说明为飞机带双
          let isDouble =
            Enumerable.from(prevPks)
              .groupBy((e) => e.value)
              .count((e) => e.getSource().length == 2) > 0;

          if (isDouble) {
            let ds = getPgs(2);
            if (ds.length < trs.length * 2) break; //对子数量不足
            let ps = Enumerable.from(rgs)
              .select((g) => {
                //找出不重复于飞机的对子并组合
                let d = spliceGroupToArray(
                  Enumerable.from(ds)
                    .where((e) => !g.contains(e._pkGroup[0], true))
                    .take(trs.length)
                    .toArray()
                );
                g.pushPokers(d);
                console.log("合并完成:" + OutType[g.outType]);
                return g;
              })
              .toArray();
            push(ps);
          } else {
            //获取所有单排
            let dd = Enumerable.from(myPks)
              .groupBy((e) => e.value)
              .select((e) => e.getSource()[0])
              .toArray();
            let sc = getPgs(3);
            if (dd.length >= trs.length * 2) {
              //单排数量不足
              let ps1 = Enumerable.from(rgs.splice(0))
                .select((g) => {
                  //找出不重复于飞机的单
                  let d = Enumerable.from(dd)
                    .where((e) => !g.contains(e, true))
                    .take(trs.length)
                    .toArray();
                  g.pushPokers(d);
                  return g;
                })
                .toArray();
              push(ps1);
            }
            if (prevLen == 12 && sc.length >= trs.length + 1) {
              let ps2 = Enumerable.from(rgs.splice(0))
                .select((g) => {
                  //找出不重复于飞机的三张
                  let th = Enumerable.from(sc)
                    .where((e) => !g.contains(e._pkGroup[0], true))
                    .select((e) => e.pgAsc)
                    .first();
                  g.pushPokers(th);
                  return g;
                })
                .toArray();
              push(ps2);
            }
          }
        }
      }
    }
    //将剩余比其大的炸弹添加到结果中
    push(
      Enumerable.from(getAllBoom())
        .where((b) => b.biggerOf(prevPks))
        .toArray()
    );
    return res;
  }

  //#endregion

  //#region 牌型检测

  /**  检测所有牌都相同*/
  private checkAllCardSame(arr: Poker[]): boolean {
    var len = arr.length;
    var isSame = true;
    for (var i = 0; i < len - 1; i++) {
      if (arr[i].value !== arr[i + 1].value) {
        isSame = false;
        break;
      }
    }
    return isSame;
  }

  /**检测是不是递增(3/4/5, 6/7/8/9...)*/
  private checkIncrease(arr: Poker[]): boolean {
    var len = arr.length;
    if (len < 2) {
      return false;
    }
    var ret = true;
    for (var i = 0; i < len - 1; i++) {
      if (arr[i].value !== arr[i + 1].value - 1) {
        ret = false;
        break;
      }
    }
    return ret;
  }

  /** 检测对子 */
  private checkDouble(arr: Poker[]): boolean {
    if (arr.length !== 2) return false;
    return this.checkAllCardSame(arr);
  }

  /**检测王炸 */
  private checkKingBomb(arr: Poker[]): boolean {
    if (arr.length !== 2) return false;
    var kingCount = 0;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].value === 16 || arr[i].value === 17) {
        kingCount++;
      }
    }
    return kingCount === 2;
  }

  /** 三张不带*/
  private checkThree(arr: Poker[]): boolean {
    if (arr.length !== 3) return false;
    return this.checkAllCardSame(arr);
  }

  /**检测三带一（带一张或者一对） */
  private checkThreeOne(arr: Poker[]): boolean {
    var len = arr.length;
    if (len !== 4 && len !== 5) return false;
    // 炸弹不算三带一
    if (this.checkBomb(arr)) return false;
    var ret = false;
    if (len === 4) {
      if (this.checkAllCardSame(arr.slice(0, arr.length - 1)) || this.checkAllCardSame(arr.slice(arr.length - 3, arr.length))) {
        ret = true;
      }
    } else if (len === 5) {
      if (this.checkAllCardSame(arr.slice(0, arr.length - 2)) && this.checkAllCardSame(arr.slice(arr.length - 2, arr.length))) {
        ret = true;
      } else if (this.checkAllCardSame(arr.slice(0, arr.length - 3)) && this.checkAllCardSame(arr.slice(arr.length - 3, arr.length))) {
        ret = true;
      }
    }
    return ret;
  }

  /**检测炸弹(5555) */
  private checkBomb(arr: Poker[]): boolean {
    if (arr.length !== 4) return false;
    return this.checkAllCardSame(arr);
  }

  /**检测单顺(34567) */
  private checkContinuousSingle(arr: Poker[]): boolean {
    var len = arr.length;
    if (len < 5 || len > 12) {
      return false;
    }

    var ret = true;
    for (var i = 0; i < len - 1; i++) {
      var pre = arr[i].value;
      var next = arr[i + 1].value;
      // 大小王、2不能算在顺子里
      if (pre === 15 || pre === 16 || pre === 17 || next === 15 || next === 16 || next === 17) {
        ret = false;
        break;
      } else if (pre !== next - 1) {
        ret = false;
        break;
      }
    }
    return ret;
  }

  /**检测双顺(连对334455) */
  private checkContinuousDouble(arr: Poker[]): boolean {
    var len = arr.length;
    if (len < 6 || len % 2 !== 0) {
      return false;
    }
    //连对不能出现2
    if (arr.some((p) => p.value === 15)) return false;

    var ret = true;
    for (var i = 0; i < len; i += 2) {
      //两张牌判定
      if (!this.checkAllCardSame(arr.slice(i, i + 2))) {
        ret = false;
        break;
      }
      if (i < len - 2) {
        if (arr[i].value !== arr[i + 2].value - 1) {
          ret = false;
          break;
        }
      }
    }

    return ret;
  }

  /**检测飞机(333444) */
  private checkAirplane(arr: Poker[]): boolean {
    var len = arr.length;
    if (len < 6 || len % 3 !== 0) {
      return false;
    }
    //飞机不带不能出现2
    if (arr.some((p) => p.value === 15)) return false;

    var ret = true;
    for (var i = 0; i < len; i += 3) {
      if (!this.checkThree(arr.slice(i, i + 3))) {
        ret = false;
        break;
      }
      if (i < len - 3) {
        if (arr[i].value !== arr[i + 3].value - 1) {
          ret = false;
          break;
        }
      }
    }

    return ret;
  }

  /**检测飞机带翅膀(33344456、3334445566) */
  private checkAirplaneWithWing(arr: Poker[]): boolean {
    var len = arr.length;
    if (len < 8) {
      return false;
    }

    var threeArr = [];
    var othersArr = [];
    // 先找出所有的三张
    for (var i = 0; i < len; ) {
      // 剩余手牌已经不够三张了
      if (i >= len - 2) {
        for (var k = i; k < len; k++) {
          othersArr.push(arr[k]);
        }
        break;
      }
      // 剩余手牌大于二张
      var key = arr[i].value;
      var count = 1;
      for (var j = i + 1; j < len; j++) {
        if (key === arr[j].value) {
          count++;
        } else {
          break;
        }
      }
      // 如果count === 4 说明有炸弹，不符合规则
      if (count === 4) {
        return false;
      } else if (count === 3) {
        threeArr.push(arr[i], arr[i + 1], arr[i + 2]);
        i = j;
      } else {
        for (var h = i; h < j; h++) {
          othersArr.push(arr[h]);
        }
        i = j;
      }
    }

    // console.log('-------飞机带翅膀判定------');
    // console.log('threes:' + JSON.stringify(threeArr));
    // console.log('others:' + JSON.stringify(othersArr));
    // console.log('-------------------------');

    // 判定三张是不是飞机
    if (!this.checkAirplane(threeArr)) {
      // 有可能三张相同牌作为单牌带出, 此时剔除一组三张作为带牌
      // 如：333444555+888
      // 如：333444555666 + 8889
      var threeLen = threeArr.length;
      if (this.checkAirplane(threeArr.slice(0, threeLen - 3))) {
        othersArr.push(threeArr[threeLen - 3], threeArr[threeLen - 2], threeArr[threeLen - 1]);
        threeArr = threeArr.slice(0, threeLen - 3);
      } else if (this.checkAirplane(threeArr.slice(3, arr.length))) {
        othersArr.push(threeArr[0], threeArr[1], threeArr[2]);
        threeArr = threeArr.slice(3, threeLen);
      } else {
        return false;
      }
    }

    // 需要翅膀数（单牌或者对子个数)
    var threeCounts = threeArr.length / 3;
    // 翅膀是单牌
    if (threeCounts === othersArr.length) {
      // 翅膀不能同时包含大小王
      var kingCount = 0;
      for (var v = 0; v < othersArr.length; v++) {
        if (othersArr[v].Value === 16 || othersArr[v].Value === 17) {
          kingCount++;
        }
      }
      return kingCount < 2;
    } else if (threeCounts === othersArr.length / 2) {
      // 翅膀是对子
      // 判断otherArr是不是全是对子
      for (var u = 0; u < othersArr.length; u = u + 2) {
        if (!this.checkAllCardSame(othersArr.slice(u, u + 2))) {
          return false;
        }
      }
      return true;
    } else {
      // 翅膀数目不对
      return false;
    }
  }

  /** 检测4带二*/
  private checkFourWithTwo(arr: Poker[]): boolean {
    var ret = false;
    if (arr.length == 6) {
      //单在右侧
      if (this.checkAllCardSame(arr.slice(0, arr.length - 2))) {
        ret = true;
        //单左右各一张
      } else if (this.checkAllCardSame(arr.slice(1, arr.length - 1))) {
        ret = true;
        //单在左侧
      } else if (this.checkAllCardSame(arr.slice(2, arr.length))) {
        ret = true;
      }
    } else if (arr.length == 8) {
      //如果是两个炸弹
      if (this.checkAllCardSame(arr.slice(0, arr.length - 4)) && this.checkAllCardSame(arr.slice(4))) ret = true;
      else {
        //如果是四带2对,则都是对子
        for (let i = 0; i < arr.length; i += 2) {
          if (!this.checkDouble(arr.slice(i, i + 2))) return false;
        }
        if (this.checkAllCardSame(arr.slice(0, arr.length - 4))) {
          ret = true;
        } else if (this.checkAllCardSame(arr.slice(2, arr.length - 2))) {
          ret = true;
        } else if (this.checkAllCardSame(arr.slice(4, arr.length))) {
          ret = true;
        }
      }
    }
    return ret;
  }

  /****************end**************/
  //#endregion
}

export default PokerGroup;
