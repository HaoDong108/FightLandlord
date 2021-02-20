import { PokerFlower, BtnSituation, OutDct } from "./Model";
import $ from "jquery";
import anime from "animejs";
import { NetPlayer } from "./NetInfos";
import Player from "./Player";
import Tools from "./Tools";

export namespace GameUi {
  export function eventBinding() {
    //管理面板-设置选项卡
    $("#pt-setting").on("click", () => {
      $(".slippanel .pages .long").css("margin-left", "0px");
    });

    //管理面板--成员选项卡
    $("#pt-mmt").on("click", () => {
      var w = $(".slippanel .pages > .long > div").width();
      $(".slippanel .pages .long").css("margin-left", "-" + w + "px");
    });

    //管理面板--聊天选项卡
    $("#pt-talk").on("click", () => {
      var dsp = $("#pg-mmt").css("display");
      var w = $(".slippanel .pages > .long > div").width();
      w = dsp === "none" ? w : w * 2;
      $(".slippanel .pages .long").css("margin-left", "-" + w + "px");
    });

    //管理面板--滑出滑入按钮
    let slipflg = false;
    $(".slippanel > .slipbtn").on("click", (e) => {
      if (!slipflg) {
        $(".slippanel").css("right", "0");
      } else {
        $(".slippanel").css("right", "-400px");
      }
      anime({
        targets: $(".slippanel > .slipbtn").children("span")[0],
        easing: "linear",
        duration: 600,
        rotate: slipflg ? 0 : 180,
      });
      slipflg = !slipflg;
    });
  }

  /**显示按钮 */
  export function showButton(sit: BtnSituation, arg: number = -1): void {
    $(".plybtns").css("visibility", "visible");
    $(".plybtns").children().css("display", "none");
    switch (sit) {
      case BtnSituation.准备:
        showBtn("btn_ready");
        break;
      case BtnSituation.出牌:
        showBtn("btn_send");
        break;
      case BtnSituation.接牌_要的起:
        showBtn("btn_send", "btn_dont", "btn_prompt");
        break;
      case BtnSituation.接牌_要不起:
        showBtn("btn_unable");
        break;
      case BtnSituation.叫分:
        switch (arg) {
          case 1:
            showBtn("btn_dontCall", "btn_one", "btn_two", "btn_three");
            break;
          case 2:
            showBtn("btn_dontCall", "btn_two", "btn_three");
            break;
          case 3:
            showBtn("btn_dontCall", "btn_three");
            break;
          default:
            throw new Error("叫分(" + arg + ")错误,下限只能是1到3");
        }
        break;
      case BtnSituation.加倍:
        showBtn("btn_notDoubly", "btn_doubly", "btn_spDoubly");
        break;
      default:
        throw new Error("意料之外的参数:" + sit);
    }

    function showBtn(...id: string[]) {
      id.forEach((i) => {
        document.getElementById(i).parentElement.style.display = "inline-block";
      });
    }
  }

  /**隐藏按钮 */
  export function hideButton() {
    $(".plybtns").css("visibility", "hidden");
  }

  /**显示提示消息 */
  export function showMsg(msg: string): void {
    var div = document.createElement("div");
    div.className = "msgbox";
    var span = document.createElement("span");
    span.innerHTML = msg;
    div.appendChild(span);
    anime({
      targets: div,
      translateY: [0, -50],
      duration: 1000,
      begin: () => {
        document.getElementsByClassName("gameRegion")[0].appendChild(div);
      },
      complete: () => {
        anime({
          targets: div,
          opacity: 0,
          duration: 300,
          easing: "linear",
          complete: () => {
            div.remove();
          },
        });
      },
    });
  }

  /**玩家牌区提示 */
  export function outMsg(msg: string, dct: OutDct): void {
    var ul: HTMLUListElement;
    switch (dct) {
      case OutDct.left:
        ul = <HTMLUListElement>document.getElementsByClassName("theyOutbox")[0].firstElementChild;
        break;
      case OutDct.right:
        ul = <HTMLUListElement>document.getElementsByClassName("theyOutbox")[0].lastElementChild;
        break;
      case OutDct.bottom:
        ul = <HTMLUListElement>document.getElementsByClassName("myOutbox")[0];
        break;
    }
    ul.innerHTML = "";
    let span = document.createElement("span");
    span.innerHTML = msg;
    ul.appendChild(span);
    setTimeout(() => {
      span.remove();
    }, 2000);
  }

  /** 炸弹甩出动画 */
  export function showZadan(dct: OutDct) {
    setTimeout(derZadan, 500);

    function derZadan() {
      let div = document.createElement("div");
      div.className = "bombox";
      div.innerHTML = `
            <div id="bom">
                <img src="../static/img/CardTypeAnime/Zadan/bomb.png" width="83px" height="103px">
                <div id="flame">
                    <img id="qiu" src="../static/img/CardTypeAnime/Zadan/b1.png">
                    <img id="huo" src="../static/img/CardTypeAnime/Zadan/b3.png">
                    <img id="qi" src="../static/img/CardTypeAnime/Zadan/b4.png">
                    <img id="guang" src="../static/img/CardTypeAnime/Zadan/b6.png">
                    <img id="bo" src="../static/img/CardTypeAnime/Zadan/b7.png">
                </div>
            </div>`;
      $(".gameRegion").append(div);
      if (dct == OutDct.bottom) {
        $("#bom").css("bottom", "0px").css("left", "0px");
      } else if (dct == OutDct.right) {
        $("#bom").css("right", "0px").css("top", "0px");
      } else {
        $("#bom").css("left", "0px").css("top", "0px");
      }

      //炸弹旋转
      anime({
        targets: "#bom>img",
        rotate: 360,
        duration: 600,
        easing: "linear",
      });
      //炸弹移动
      anime({
        targets: "#bom",
        translateX: dct !== OutDct.right ? 140 : -140,
        translateY: dct !== OutDct.bottom ? 140 : -140,
        scale: [0.6, 1],
        duration: 600,
        easing: "linear",
        complete: function () {
          baoza();
        },
      });

      function baoza() {
        screenJitter();
        //删除炸弹
        $(".bombox>#bom>img").remove();
        $(".bombox>#bom>#flame").css("visibility", "visible");
        anime({
          targets: ".bombox>#bom>#flame",
          opacity: 0,
          duration: 3000,
          easing: "linear",
          complete: function () {
            $(".bombox").remove();
          },
        });
        //光球扩散
        anime({
          targets: "#flame>#qiu",
          scaleX: [1, 2],
          scaleY: [1, 1.5],
          duration: 3000,
          easing: "linear",
        });
        //火光扩散
        anime({
          targets: "#flame>#huo",
          scaleX: [1, 2],
          scaleY: [1, 1.5],
          duration: 2000,
          opacity: 0,
          easing: "linear",
          complete: function () {
            $("#flame>#huo").hide();
          },
        });
        //气流扩散
        anime({
          targets: ["#flame>#qi", "#flame>#bo"],
          scaleX: [1, 3],
          duration: 3500,
          easing: "easeOutQuart",
        });
        //光圈延迟显示
        anime({
          targets: "#flame>#guang",
          scale: [1, 2],
          easing: "linear",
          duration: 2500,
          delay: 300,
          opacity: [0, 1],
        });
      }
    }
  }

  /** 顺子动画 */
  export function showSunzi() {
    let div = document.createElement("div");
    div.className = "sunbox";
    div.innerHTML = ` <div id="cuan">
            <div class="jiang" id="j1"></div>
            <div class="jiang" id="j2"></div>
            <div class="jiang" id="j3"></div>
            <div class="jiang" id="j4"></div>
            <div class="jiang" id="j5"></div>
            <div id="bolang"></div>
        </div>
        <div id="sunword"></div>
        <div id="feng"></div>`;
    $(".gameRegion").append(div);
    //风背景切换
    let stae = 0;
    var tim = setInterval(function () {
      switch (stae) {
        case 0:
          $("#feng").css("width", "170px").css("transform", "rotate(90deg) scale(0.8)");
          $("#feng").css("background-position-x", "-740px");
          $("#feng").css("background-position-y", "-513px");
          break;
        case 1:
          $("#feng").css("transform", "scale(0.6)");
          $("#feng").css("background-position-x", "-445px").css("width", "295px");
          $("#feng").css("background-position-y", "-478px");
          break;
        case 2:
          $("#feng").css("background-position-x", "-49px").css("width", "370px");
          $("#feng").css("background-position-y", "-749px");
          break;
        case 3:
          $("#feng").css("background-position-x", "-40px");
          $("#feng").css("background-position-y", "-499px");
          break;
      }
      stae++;
      if (stae >= 4) {
        clearInterval(tim);
      }
    }, 150);
    //风淡出
    anime({
      targets: "#feng",
      opacity: 0,
      duration: 1000,
      easing: "linear",
    });
    //船桨动画
    anime({
      targets: "#cuan > .jiang",
      easing: "linear",
      rotate: [-20, 30],
      duration: 500,
      loop: 5,
    });
    //文字动画
    anime({
      targets: "#sunword",
      easing: "easeOutQuad",
      duration: 600,
      translateX: [-50, 20],
      opacity: 1,
      delay: 300,
      complete: function () {
        anime({
          targets: "#sunword",
          easing: "easeInBack",
          translateX: 200,
          opacity: 0,
          duration: 1000,
          delay: 300,
        });
      },
    });
    //船体动画
    anime({
      targets: "#cuan",
      easing: "easeOutQuad",
      duration: 600,
      translateX: [-100, 200],
      opacity: 1,
      delay: 300,
      complete: function () {
        anime({
          targets: "#cuan",
          easing: "easeInBack",
          translateX: 400,
          opacity: 0,
          duration: 1000,
          delay: 200,
          complete: function () {
            $(".sunbox").remove();
          },
        });
      },
    });
  }

  /** 屏幕震动 */
  export function screenJitter() {
    let sleep = 50;
    for (let i = 0; i <= 30; i++) {
      setTimeout(function () {
        move(i, 15 - i / 2);
      }, sleep);
      sleep += 50;
    }

    function move(num: number, amp: number) {
      if (amp > 10) amp = 10;
      switch (num % 4) {
        case 0:
          $(document.body).css("background-position-x", "-" + amp + "px");
          $(document.body).css("background-position-y", "0px");
          break;
        case 1:
          $(document.body).css("background-position-x", "0px");
          $(document.body).css("background-position-y", "-" + amp + "px");
          break;
        case 2:
          $(document.body).css("background-position-x", amp + "px");
          $(document.body).css("background-position-y", "0px");
          break;
        case 3:
          $(document.body).css("background-position-x", "0px");
          $(document.body).css("background-position-y", amp + "px");
          break;
      }
    }
  }

  /**飞机动画 */
  export function showPanel() {
    let div = document.createElement("div");
    div.className = "pbox";
    div.innerHTML = `<img src="../static/img/CardTypeAnime/Panel/panel.png">`;
    $(".gameRegion").append(div);
    var tim = setInterval(function () {
      trailing();
    }, 100);

    anime({
      targets: div,
      translateX: [200, -1800],
      scale: [0.4, 2],
      opacity: {
        value: [0, 1],
        dueation: 500,
        easing: "linear",
      },
      translateY: [
        { value: 300, easing: "linear", duration: 1200, delay: 200 },
        { value: -200, easing: "linear", duration: 800, delay: 200 },
      ],
      duration: 2000,
      easing: "easeInExpo",
      complete: function () {
        clearInterval(tim);
        $(div).remove();
      },
    });

    function trailing() {
      //随机生成光效粒子坐标和颜色
      let r = anime.random(220, 235);
      let g = anime.random(210, 235);
      let b = anime.random(140, 170);
      let top = anime.random(40, 70);
      let left = anime.random(290, 330);
      let dv = document.createElement("div");
      dv.className = "particle";
      $(dv)
        .css("top", top + "px")
        .css("left", left + "px")
        .css("background-image", `radial-gradient(closest-side at 47% 55%, rgb(${r}, ${g}, ${b}) 40%, transparent)`);
      $(".pbox").append(dv);
      //向后偏移及逐渐隐藏
      anime.set(dv, { scale: 1 + (Math.floor(Math.random() * 7) + 1) / 10 });
      anime({
        targets: dv,
        scale: 0,
        opacity: 0,
        translateX: anime.random(70, 430),
        translateY: anime.random(-20, 20),
        easing: "linear",
        duration: 1700,
        complete: function () {
          $(dv).remove();
        },
      });
    }
  }

  /**连对动画 */
  export function showLiandui() {
    let div = document.createElement("div");
    div.className = "lbox";
    div.innerHTML = ` <img src="../static/img/CardTypeAnime/Liandui/liandui.png")}">`;
    $(".gameRegion").append(div);
    anime({
      targets: ".lbox>img",
      translateX: {
        value: [-100, 0],
        easing: "easeOutBack",
        duration: 800,
      },
      opacity: {
        value: 1,
        easing: "linear",
        duration: 600,
      },
      duration: 1000,
      complete: function () {
        //退出
        anime({
          targets: ".lbox>img",
          translateX: 100,
          opacity: {
            value: 0,
            easing: "linear",
            duration: 300,
            delay: 1200,
          },
          easing: "easeInBack",
          duration: 1000,
          delay: 500,
          complete: function () {
            $(".lbox").remove();
          },
        });
      },
    });
  }

  /**火箭动画 */
  export function showHuojian() {
    setTimeout(up, 500);
    //火箭上升动画
    function up() {
      let div = document.createElement("div");
      div.className = "hjbox";
      div.innerHTML = `<img id="guangshu" src="../static/img/CardTypeAnime/huojian/h2.png" width="80px" height="1px">
        <img id="quan" src="../static/img/CardTypeAnime/zadan/b4.png" width="200" height="50px">
        <div id="blueql"></div>
        <img id="huojian" src="../static/img/CardTypeAnime/huojian/hj.png" width="90px" height="130px">
        <img id="shanguang" src="../static/img/CardTypeAnime/huojian/h7.png" width="300px" height="30px">
        <img id="pense" src="../static/img/CardTypeAnime/huojian/h3.png" width="60px" height="100px">
        <div id="hjspec">
            <img id="mogu" src="../static/img/CardTypeAnime/huojian/h8.png" width="204px" height="191px">
            <img id="mogu2" src="../static/img/CardTypeAnime/huojian/h8.png" width="160px" height="148px">
        </div>
        <div id="flame">
            <img id="qiu" src="../static/img/CardTypeAnime/zadan/b1.png">
            <img id="huo" src="../static/img/CardTypeAnime/zadan/b3.png">
            <img id="qi" src="../static/img/CardTypeAnime/zadan/b4.png">
            <img id="guang" src="../static/img/CardTypeAnime/zadan/b6.png">
            <img id="bo" src="../static/img/CardTypeAnime/zadan/b7.png">
            <img id="wdot" src="../static/img/CardTypeAnime//huojian/h4.png">
        </div>`;
      $(".gameRegion").append(div);
      var hj = document.getElementById("huojian");
      anime.set(".hjbox>#shanguang", { scale: 0 });
      anime.set(".hjbox>#pense", { height: 1 });
      anime.set(".hjbox>#quan", { scale: 0 });
      //压缩Y轴
      anime({
        targets: hj,
        easing: "linear",
        duration: 500,
        height: 100,
        direction: "alternate",
      });
      //火箭发射
      anime({
        targets: hj,
        easing: "linear",
        duration: 800,
        translateY: -700,
        delay: 500,
        begin: () => {
          // //蓝色气场
          $(".hjbox>#blueql")
            .delay(300)
            .animate(
              {
                backgroundPositionY: 0,
              },
              500,
              "linear",
              () => {
                $(".hjbox>#blueql").animate(
                  {
                    backgroundPositionY: 80,
                  },
                  500,
                  "linear"
                );
              }
            );
          anime({
            targets: ".hjbox>#blueql",
            easing: "linear",
            direction: "alternate",
            duration: 500,
            scaleX: [0, 1],
            delay: 300,
            begin: () => {
              $(".hjbox>#blueql").show();
            },
          });
          //底部闪光
          anime({
            targets: ".hjbox>#shanguang",
            easing: "linear",
            direction: "alternate",
            duration: 800,
            scale: 1,
            delay: 300,
          });
        },
      });
      //白色气流尾随
      anime({
        targets: ".hjbox>#pense",
        easing: "linear",
        height: {
          value: 100,
          duration: 400,
        },
        translateY: -700,
        duration: 800,
        delay: 500,
        changeBegin: () => {
          $(".hjbox>#pense").show();
        },
      });
      //气场圈
      anime({
        targets: ".hjbox>#quan",
        easing: "easeOutQuart",
        duration: 2000,
        opacity: 0,
        scale: 1.6,
        delay: 500,
        begin: () => {
          $(".hjbox>#quan").show();
        },
        complete: () => {
          down();
        },
      });
      //蓝色光束
      anime({
        targets: ".hjbox>#guangshu",
        easing: "linear",
        height: 400,
        scaleX: 0.2,
        duration: 1000,
        delay: 500,
        changeBegin: () => {
          $(".hjbox>#guangshu").show();
        },
        complete: () => {
          anime({
            targets: ".hjbox>#guangshu",
            easing: "linear",
            opacity: 0,
            duration: 500,
          });
        },
      });
    }
    //火箭下坠动画
    function down() {
      anime.set(".hjbox>#huojian", { rotate: 180 });
      anime.set(".hjbox>#pense", { rotate: 180, translateY: "-=220" });
      //火箭下坠
      anime({
        targets: [".hjbox>#huojian", ".hjbox>#pense"],
        easing: "linear",
        duration: 800,
        translateY: "+=700",
        complete: () => {
          $(".hjbox>#huojian").remove();
          $(".hjbox>#pense").remove();
          screenJitter();
          baoza();
          specbom();
        },
      });
    }
    //爆炸动画
    function baoza() {
      $(".hjbox>#flame").css("visibility", "visible");
      anime({
        targets: ".hjbox>#flame",
        opacity: 0,
        duration: 3000,
        easing: "linear",
        complete: function () {
          $(".hjbox").remove();
        },
      });
      //光球扩散
      anime({
        targets: ["#flame>#qiu", "#flame>#wdot"],
        scaleX: [1, 2],
        scaleY: [1, 1.5],
        opacity: 0,
        duration: 2000,
        easing: "linear",
      });
      //火光扩散
      anime({
        targets: "#flame>#huo",
        scaleX: [1, 2],
        scaleY: [1, 1.5],
        duration: 2000,
        opacity: 0,
        easing: "linear",
        complete: function () {
          $("#flame>#huo").hide();
        },
      });
      //气流扩散
      anime({
        targets: ["#flame>#qi", "#flame>#bo"],
        scaleX: [1, 4],
        duration: 4000,
        easing: "easeOutQuart",
      });
      //光圈延迟显示
      anime({
        targets: "#flame>#guang",
        scale: [1, 2],
        easing: "linear",
        duration: 2500,
        delay: 300,
        opacity: [0, 1],
      });
    }
    //火箭爆炸特殊效果
    function specbom() {
      anime({
        targets: [".hjbox>#hjspec>#mogu", ".hjbox>#hjspec>#mogu2"],
        opacity: 0,
        easing: "linear",
        translateY: -100,
        scale: 2,
        duration: 2000,
        changeBegin: () => {
          $(".hjbox>#hjspec>#mogu").show();
          $(".hjbox>#hjspec>#mogu2").show();
          whiteScreen();
        },
      });
    }
    //白屏效果
    function whiteScreen() {
      let div = document.createElement("div");
      div.id = "wblk";
      $(".gameRegion").append(div);
      anime({
        targets: div,
        easing: "linear",
        duration: 2000,
        opacity: 0,
        complete: () => {
          $(div).remove();
        },
      });
    }
  }

  let waitanime;
  /**显示等待页面 */
  export function showWait(mes: string) {
    $(".waitbox").remove();
    let div = document.createElement("div");
    div.className = "waitbox";
    div.innerHTML = `<div class="waitbox">
        <span>${mes}</span>
        <span class="dot">.</span>
        <span class="dot">.</span>
        <span class="dot">.</span>
    </div>`;
    $(".gameRegion").append(div);
    waitanime = anime({
      targets: ".waitbox>.dot",
      easing: "linear",
      translateY: [0, -8, 0],
      duration: 900,
      loop: true,
      delay: anime.stagger(300),
    });
  }

  /**隐藏等待提示 */
  export function hideWait() {
    if (waitanime) {
      waitanime.pause();
    }
    $(".waitbox").remove();
  }

  /**显示准备提示 */
  export function showReady(dct: OutDct) {
    let dom: Element;
    if (dct == OutDct.left) {
      dom = $(".leftGamer .readflg")[0];
    } else {
      dom = $(".rightGamer .readflg")[0];
    }
    $(dom).show();
    anime({
      targets: dom,
      easing: "easeInExpo",
      duration: 500,
      opacity: [0, 1],
      scale: [1.3, 1],
      rotate: [-10, 0],
    });
  }

  /**隐藏准备标签 */
  export function hiadeReady() {
    $(".readflg").removeAttr("style").hide();
  }

  /**设置角色 */
  export function setRole(dct: OutDct, id: number) {
    switch (dct) {
      case OutDct.left:
        $(".role-left").css("background", `url(../static/img/Roles/role${id}.png) no-repeat`).css("background-size", "contain");
        if (id == 0) $(".role-left").addClass("roleask");
        else $(".role-left").removeClass("roleask");
        break;
      case OutDct.right:
        $(".role-right").css("background", `url(../static/img/Roles/role${id}.png) no-repeat`).css("background-size", "contain");
        if (id == 0) $(".role-right").addClass("roleaskrig");
        else $(".role-right").removeClass("roleaskrig");
        break;
      case OutDct.bottom:
        $(".role-own").css("background", `url(../static/img/Roles/role${id}.png) no-repeat`).css("background-size", "contain");
        if (id == 0) $(".role-own").addClass("roleask");
        else $(".role-own").removeClass("roleask");
        break;
    }
  }

  /**显示指定方位闹钟 */
  export function showClock(dct: OutDct) {
    var tag = dct == OutDct.bottom ? document.getElementsByClassName("clock_bottom")[0] : dct == OutDct.left ? document.getElementsByClassName("clock_lef")[0] : document.getElementsByClassName("clock_rig")[0];
    $(".clock").hide();
    $(tag).html("30").show();
  }

  /**隐藏闹钟 */
  export function hideClock(btm?: boolean) {
    if (btm) {
      $(".clock_bottom").hide().html("30");
    } else {
      $(".clock").hide().html("30");
    }
  }

  /**显示玩家警报 */
  export function showWringLamp(dct: OutDct) {
    let tag = dct == OutDct.left ? $(".wringlamp-lef") : dct == OutDct.right ? $(".wringlamp-rig") : $(".wringlamp-btm");
    tag.css("visibility", "visible");
  }

  /**隐藏所有玩家警报 */
  export function hideAllWring() {
    $(".wringlamp").css("visibility", "hidden");
  }

  /**设置闹钟时间 */
  export function setTik(tik: string) {
    $(".clock").html(tik);
    if (Number.parseInt(tik) <= 10) {
      anime({
        targets: ".clock",
        scale: {
          value: [1, 1.1],
          direction: "alternate",
          easing: "linear",
          duration: 600,
        },
        easing: "linear",
        duration: 500,
        keyframes: [{ rotateZ: -10 }, { rotateZ: 0 }, { rotateZ: 10 }, { rotateZ: 0 }, { rotateZ: -10 }, { rotateZ: 0 }, { rotateZ: 10 }, { rotateZ: 0 }],
      });
    }
  }

  /**显示玩家出牌完毕提示 */
  export function showOutFinish(dct: OutDct) {
    let dom = document.getElementsByClassName(dct == OutDct.left ? "outfinish-lef" : dct == OutDct.right ? "outfinish-rig" : "outfinish-btm")[0];
    anime.set(dom, { scale: 0 });
    $(dom).show();
    anime({
      targets: dom,
      scale: 1,
      duration: 200,
      easing: "linear",
      complete: function () {
        anime({
          targets: dom,
          scale: 0,
          duration: 200,
          easing: "linear",
          delay: 1500,
          complete: function () {
            $(dom).hide();
          },
        });
      },
    });
  }

  /**显示地主/农民胜负标签 */
  export function showWLFlg(win: boolean, island: boolean) {
    let dir = win ? "../static/img/Win/" : "../static/img/Lose/";
    let src = island ? dir + "land.png" : dir + "fm.png";

    let img = document.createElement("img");
    anime.set(img, { scale: 0 });
    $(img).attr("src", src);
    $(img).addClass("lfwl");
    $(".gameRegion").append(img);
    let line = anime.timeline({
      targets: img,
    });
    line.add({
      duration: 1200,
      scale: 1,
    });
    line.add({
      delay: 3000,
      duration: 800,
      scale: 0,
      easing: "linear",
      complete: function () {
        $(img).remove();
      },
    });
  }

  /**
   * 显示统计面板
   * @param btscore 底分
   * @param mup 倍数
   * @param score 得/扣分
   * @param plyscore 玩家初始分数
   * @param win 是否胜利
   **/
  export function showWLPanel(btscore: number, mup: number, score: number, plyscore: number, win: boolean) {
    let tag = document.getElementsByClassName("wlbox")[0];
    $(tag).addClass(win ? "winbox" : "losebox");
    $("#btsc").text(btscore); //底分
    $("#mple").text(mup); //倍数
    $("#score")
      .text("0")
      .prev()
      .text(win ? "本局得分:" : "本局扣分:");
    $("#remsc").text(plyscore); //剩余分数
    $(".wlmask").show();
    let zf = win ? "+" : "-";
    var obj = {
      sco: 0,
      rem: plyscore,
    };
    let line = anime.timeline();
    //面板弹出
    line.add({
      targets: tag,
      scale: [0, 1],
      duration: 1500,
    });
    //得扣分动画
    line.add({
      targets: obj,
      sco: score,
      easing: "linear",
      duration: 1000,
      update: () => {
        $("#score").text(zf + Math.floor(obj.sco).toString());
      },
    });
    line.add({
      targets: obj,
      rem: zf + "=" + score,
      easing: "linear",
      duration: 1000,
      update: () => {
        $("#remsc").text(Math.floor(obj.rem).toString());
      },
    });
    $(tag).show();
    let t = setInterval(() => {
      if ($(tag).css("display") == "none") {
        clearInterval(t);
      }
      addLeaf();
    }, 300);
    //添加叶子
    function addLeaf() {
      let img = document.createElement("img");
      $(img).attr("src", `../static/img/${win ? "Win" : "Lose"}/p1.png`);
      let lef = anime.random(80, 350);
      let div = document.createElement("div");
      div.className = "leaf";
      div.appendChild(img);
      div.style.left = lef + "px";
      $(tag).append(div);
      anime({
        targets: img,
        easing: "linear",
        loop: true,
        rotate: anime.random(0, 6) % 2 == 0 ? anime.random(360, 720) : anime.random(-360, -720),
        duration: 2000,
      });
      anime.set(div, {
        scale: Math.floor(Math.random()) + 1,
      });
      anime({
        targets: div,
        scale: 0,
        opacity: 0,
        easing: "linear",
        top: 500,
        translateX: anime.random(-300, 300),
        duration: 4000,
        complete: function () {
          $(div).remove();
        },
      });
    }
  }

  /**隐藏统计面板 */
  export function hideWLPanel() {
    let tag = document.getElementsByClassName("wlbox")[0];
    anime({
      targets: tag,
      scale: 0,
      easing: "easeInBack",
      duration: 700,
      complete: () => {
        $(tag).removeClass("winbox").removeClass("losebox").hide();
        $(".wlmask").hide();
      },
    });
  }

  /**设置玩家信息*/
  export function setGamerInfo(dct: OutDct, ply: NetPlayer) {
    $(dct == OutDct.left ? "#lef-name" : dct == OutDct.right ? "#rig-name" : "#btm-name").text(ply.Name);
    $(dct == OutDct.left ? "#lef-id" : dct == OutDct.right ? "#rig-id" : "#btm-id").text("ID:" + ply.PlayerID);
    $(dct == OutDct.left ? "#slip-lef-name" : dct == OutDct.right ? "#slip-rig-name" : "#slip-btm-name").text(ply.Name);
    $(dct == OutDct.left ? "#slip-lef-ip" : dct == OutDct.right ? "#slip-rig-ip" : "#slip-btm-ip").text(ply.IP);
    $(dct == OutDct.left ? "#slip-lef-head" : dct == OutDct.right ? "#slip-rig-head" : "#slip-btm-head").attr("src", "../static/img/HeadImgs/an" + ply.HeadID + ".png");
    $(dct == OutDct.left ? "#money-lef" : dct == OutDct.right ? "#money-rig" : "#money-btm").text(Tools.markUnitConver(parseInt(ply.Mark)));
    $(dct == OutDct.left ? ".slippanel .pages .top .lef" : dct == OutDct.right ? ".slippanel .pages .top .rig" : ".slippanel .pages .btm").css("visibility", "visible");
    setRole(dct, ply.RoleID);
  }

  /**去除玩家信息 */
  export function restoreInfo(dct: OutDct) {
    $(dct == OutDct.left ? "#lef-name" : dct == OutDct.right ? "#rig-name" : "#btm-name").text("");
    $(dct == OutDct.left ? "#lef-id" : dct == OutDct.right ? "#rig-id" : "#btm-id").text("");
    $(dct == OutDct.left ? "#slip-lef-name" : dct == OutDct.right ? "#slip-rig-name" : "#slip-btm-name").text("");
    $(dct == OutDct.left ? "#slip-lef-ip" : dct == OutDct.right ? "#slip-rig-ip" : "#slip-btm-ip").text("");
    $(dct == OutDct.left ? "#slip-lef-head" : dct == OutDct.right ? "#slip-rig-head" : "#slip-btm-head").attr("src", "../static/img/HeadImgs/an0.png");
    $(dct == OutDct.left ? "#money-lef" : dct == OutDct.right ? "#money-rig" : "#money-btm").text("");
    $(dct == OutDct.left ? ".slippanel .pages .top .lef" : dct == OutDct.right ? ".slippanel .pages .top .rig" : ".slippanel .pages .btm").css("visibility", "hidden");
    if (dct != OutDct.bottom) $(dct == OutDct.left ? ".leftGamer .readflg" : ".rightGamer .readflg").hide();
    setRole(dct, 0);
  }

  /**显示房间ID块 */
  export function showRoomID() {
    let div = $(".roomidbox")[0];
    anime({
      targets: div,
      duration: 1000,
      easing: "linear",
      top: 0,
    });
  }

  /**隐藏房间ID块 */
  export function hideRoomID() {
    let div = $(".roomidbox")[0];
    anime({
      targets: div,
      duration: 1000,
      easing: "linear",
      top: -($(div).height() + 10),
    });
  }

  /**开启成员管理 */
  export function openmmt() {
    $("#pt-mmt").css("display", "table-cell");
    $("#pg-mmt").show();
  }

  /**关闭成员管理 */
  export function closemmt() {
    $("#pt-mmt").css("display", "none");
    $("#pg-mmt").hide();
  }
}
