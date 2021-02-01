import $ from "jquery";
import anime from "animejs";

namespace Tools {
  /**金钱单位转换 */
  export function markUnitConver(mark: number): string {
    if (mark < 10000) return mark.toString();
    let w = mark / 10000;
    if (w < 10000) {
      return mark > 0 ? w.toFixed(1) + "万" : "-" + w.toFixed(1) + "万";
    } else {
      return mark > 0 ? (w / 10000).toFixed(1) + "亿" : "-" + (w / 10000).toFixed(1) + "亿";
    }
  }

  /**设置cookie */
  export function setCookie(key: string, value: string, second: number = 900) {
    let exp = new Date();
    let ms = new Date().getTime() + second * 1000;
    exp.setTime(ms);
    document.cookie = `${key}=${value};expires=${exp.toUTCString()};path=/`;
  }

  /**返回cookie */
  export function getCookie(key: string): string {
    var strcookie = document.cookie; //获取cookie字符串
    var arrcookie = strcookie.split("; "); //分割
    //遍历匹配
    for (var i = 0; i < arrcookie.length; i++) {
      var arr = arrcookie[i].split("=");
      if (arr[0] == key) {
        return arr[1];
      }
    }
    return "";
  }

  /**在界面显示提示信息 */
  export function shwoPrompt(text: string, showtime: number = 1000, icon: PromptIcon = PromptIcon.info) {
    let info = $(document.createElement("span")).text("i").addClass("inf ico");
    let erro = $(document.createElement("span")).text("✘").addClass("erro ico");
    let ok = $(document.createElement("span")).text("✔").addClass("succ ico");
    let div = document.createElement("div");
    div.innerHTML = `<span class="innertext">${text}</span>`;
    $(div).addClass("prompt");
    switch (icon) {
      case PromptIcon.info:
        $(div).prepend(info);
        break;
      case PromptIcon.erro:
        $(div).prepend(erro);
        break;
      case PromptIcon.ok:
        $(div).prepend(ok);
        break;
    }
    $(".msParent").append(div);
    let w = Math.floor($(div).width() / 2).toString();
    let h = Math.floor($(div).height() + 20 / 2).toString();
    $(div).css("margin-left", "-" + w + "px");
    $(div).css("margin-top", "-" + h + "px");
    $(div).fadeIn(500);
    setTimeout(() => {
      anime({
        targets: div,
        duration: 600,
        easing: "linear",
        translateY: -50,
        opacity: 0,
        complete: () => {
          $(div).remove();
        },
      });
    }, showtime);
  }
  export function showMsbox(text: string, okcallback?: Function): void;
  export function showMsbox(text: string, title: string, okcallback?: Function): void;
  export function showMsbox(text: string, title: string, btns: MsButtons, mscallback?: (e: boolean) => void): void;
  export function showMsbox(arg1: string, arg2?: string | Function, arg3?: MsButtons | Function, arg4?: (e: boolean) => void): void {
    let div = document.createElement("div");
    div.className = "megbox";
    let tle: string = "";
    let txt: string = "";
    let btns: MsButtons = MsButtons.ok;
    let cbk: Function = null;
    txt = arg1;
    if (typeof arg2 == "string") tle = arg2;
    if (typeof arg2 == "function") cbk = arg2;
    if (typeof arg3 == "number") btns = <MsButtons>arg3;
    if (typeof arg3 == "function") cbk = arg3;
    if (arg4) cbk = arg4;
    let dm = `
    <div class="center">
      <div class="head">
        <span class="title">${tle}</span>
        <div class="cblock"></div>
      </div>
      <div class="text flex-center">
        <span>${txt}</span>
      </div>
      <div class="msbtns">
      </div>
    </div>`;
    div.innerHTML = dm;
    let dom = $(div).children().children(".msbtns");
    if (btns != MsButtons.ok) {
      let bt1 = document.createElement("button");
      let bt2 = document.createElement("button");
      bt1.className = "homebtn homebtn-color-cyan";
      bt2.className = "homebtn homebtn-color-red";
      $(bt1).text(btns == MsButtons.okAndCancel ? "确认" : "是");
      $(bt2).text(btns == MsButtons.okAndCancel ? "取消" : "否");
      if (cbk) {
        bt1.onclick = () => {
          cbk(true);
        };
        bt2.onclick = () => {
          cbk(false);
        };
      }
      dom.append(bt1).append(bt2);
    } else {
      let b_ok = document.createElement("button");
      b_ok.className = "homebtn homebtn-color-cyan";
      b_ok.innerHTML = "确认";
      if (cbk) {
        b_ok.onclick = () => cbk();
      }
      dom.append(b_ok).append(b_ok);
    }
    $(".msParent").append(div);
    $(div).fadeIn(500).css("display", "flex");
    dom.children().on("click", () => {
      $(div).fadeOut(500, "linear", () => {
        $(div).remove();
      });
    });
  }

  /**返回指定范围的整随机数 */
  export function getRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  export enum PromptIcon {
    none,
    erro,
    ok,
    info,
  }
  export enum MsButtons {
    ok,
    yesAndNo,
    okAndCancel,
  }
}

export default Tools;
