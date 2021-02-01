import $ from "jquery";
import Player from "./Player";
import anime from "animejs";
import { EventEmitter } from "events";
import Tools from "./Tools";

namespace HomeUi {
  let onloking = false; //标识是否正在匹配
  let temp_headid = 1; //头像编号
  let temp_username = "游客";
  let temp_gender = 0;
  let temp_roleid = 1;
  var event: EventEmitter = new EventEmitter();
  export var Event_开始匹配 = "startMatching";
  export var Event_取消匹配 = "stopMatching";
  export var Event_创建房间 = "createRoom";
  export var Event_信息保存 = "changeinfo";

  export function init() {
    //取消全局鼠标选中以及拖功能
    document.body.ondrag = () => false;
    document.body.onselectstart = () => false;
    document.body.ondragstart = () => false;

    //设定动画元素初始样式
    anime.set(".region footer>.lokfor", { translateY: 100 });
    anime.set(".region footer>.lokfor>.innertext", { scale: 0 });
    anime.set(".roombox>.rolelogo", { translateY: 300 });
    anime.set(".roombox>.center", { translateY: -1000 });
    $(".radio>.content>.innerback").css("border-radius", "20px 20px 20px 0px");
    $(".radio>.content>.sendbox").css("border-radius", "0px 20px 20px 20px");

    //点跳跃动画
    anime({
      targets: ".lokfor .dot",
      easing: "linear",
      translateY: [0, -8, 0],
      duration: 900,
      loop: true,
      delay: anime.stagger(300),
    });

    // //发送广播块白线流光
    // let o = { i: 20 };
    // anime({
    //   targets: o,
    //   duration: 3000,
    //   easing: "linear",
    //   i: 80,
    //   loop: true,
    //   direction: "alternate",
    //   update: function () {
    //     if ($(".radio>.content>.sendbox").css("display") != "none") $(".radio>.content>.sendbox").css("border-image-source", " linear-gradient(90deg, transparent, white " + o.i + "%,transparent");
    //   },
    // });

    eventbind();
  }

  function eventbind() {
    let btnlock = false;
    //快速匹配按钮
    $(".quick>.indiv").on("click", function (e) {
      if (btnlock) return;
      btnlock = true;
      e.stopPropagation();
      if (!onloking) {
        //触发开始匹配事件
        event.emit(Event_开始匹配);
        $("footer>.lokfor");
        anime({
          targets: "footer>.lokfor",
          translateY: 0,
          duration: 500,
          easing: "linear",
        });
        anime({
          targets: "footer>.lokfor>.innertext",
          scale: 1,
          duration: 500,
          delay: 350,
        });
        $(this).children().children().text("取消匹配");
      } else {
        //触发取消匹配事件
        event.emit(Event_取消匹配);
        anime({
          targets: "footer>.lokfor>.innertext",
          scale: 0,
          duration: 500,
          linear: "easeInBack",
        });
        anime({
          targets: "footer>.lokfor",
          translateY: 100,
          duration: 500,
          easing: "linear",
          delay: 350,
        });
        $(this).children().children().text("快速匹配");
      }
      onloking = !onloking;
      setTimeout(() => {
        btnlock = false;
      }, 500);
    });

    //寻找房间按钮
    $(".create>.indiv").on("click", function (e) {
      if (onloking) {
        Tools.shwoPrompt("请先取消匹配!", 1500, Tools.PromptIcon.info);
        return;
      }
      e.stopPropagation();
      $(".roombox").fadeIn(500).css("display", "flex");
      let role = $(".roombox>.rolelogo")[0];
      let content = $(".roombox>.center")[0];
      anime({
        targets: role,
        duration: 800,
        easing: "easeOutBack",
        translateY: 0,
      });
      anime({
        targets: content,
        easing: "easeOutElastic",
        duration: 1500,
        translateY: 0,
        delay: 600,
      });
    });

    //退出房间按钮
    let rombtlock = false;
    $("#quitroom").on("click", function (e) {
      e.stopPropagation();
      if (rombtlock) return;
      rombtlock = true;
      let role = $(".roombox>.rolelogo")[0];
      let content = $(".roombox>.center")[0];
      anime({
        targets: role,
        duration: 800,
        easing: "easeInBack",
        translateY: 300,
      });
      anime({
        targets: content,
        easing: "easeInBack",
        duration: 1000,
        translateY: -1000,
        delay: 600,
        complete: function () {
          $(".roombox").fadeOut(500).css("display", "none");
          rombtlock = false;
        },
      });
    });

    //广播栏键盘图标
    let radius = { rd: 20, ru: 20 };
    $(".jianpan>i").on("click", function (e) {
      e.stopPropagation();
      anime({
        targets: radius,
        duration: 1000,
        easing: "linear",
        rd: Math.abs(radius.rd - 20),
        ru: Math.abs(radius.ru - 20),
        update: function () {
          $(".radio>.content>.innerback").css("border-radius", "20px  20px " + radius.rd + "px 0px");
          $(".radio>.content>.sendbox").css("border-radius", "0px " + radius.ru + "px 20px 20px");
        },
      });
      $(".radio>.content>.sendbox")
        .stop()
        .slideToggle(600, function () {
          let dom = $(".radio>.content>.sendbox");
          let diply = dom.css("display");
          if (diply != "none") dom.css("display", "flex");
        });
    });

    //信息修改按钮
    $("#setinfo").on("click", function () {
      showChangeInfoPanel();
    });

    //信息修改保存按钮
    $("#icsave").on("click", function () {
      temp_username = (<string>$("#icname").val()).trim();
      if (temp_username.length == 0) {
        Tools.shwoPrompt("昵称不能为空", 1500);
        return;
      }
      if ((<string>$("#icname").val()).length > 7) {
        Tools.shwoPrompt("昵称不能超过7个字符", 1500);
        return;
      }
      $(".infochange").fadeOut(500);
      $("#prole").attr("src", "../static/img/Roles/role" + temp_roleid + ".png");
      $("#pname").text(temp_username);
      $("#psex")
        .removeClass("icon-nan")
        .removeClass("icon-nv")
        .addClass(temp_gender == 0 ? "icon-nan" : "icon-nv");
      $("#phead").attr("src", "../static/img/HeadImgs/an" + temp_headid + ".png");
      Tools.shwoPrompt("保存成功!", 1500, Tools.PromptIcon.ok);

      let ags = {
        name: temp_username,
        roleid: temp_roleid,
        headid: temp_headid,
        gender: temp_gender,
      };
      event.emit(Event_信息保存, ags);
    });

    //信息修改退出按钮
    $("#icquit").on("click", function () {
      Tools.showMsbox("确定退出吗?", "提示", Tools.MsButtons.yesAndNo, (e) => {
        if (e) {
          $(".infochange").fadeOut(500);
        }
      });
    });

    //信息栏上一个按钮
    $("#rolelast").on("click", function () {
      if (--temp_roleid <= 0) temp_roleid = 8;
      changerole(temp_roleid);
    });

    //信息栏下一个按钮
    $("#rolenext").on("click", function () {
      if (++temp_roleid > 8) temp_roleid = 1;
      changerole(temp_roleid);
    });

    function changerole(rid: number) {
      let cgflg = false;
      anime.remove("#icrole");
      anime({
        targets: "#icrole",
        scale: [1, 1.2],
        opacity: [1, 0],
        direction: "alternate",
        duration: 200,
        easing: "linear",
        changeComplete: function () {
          if (!cgflg) {
            $("#icrole").attr("src", "../static/img/Roles/role" + rid + ".png");
            cgflg = true;
          }
        },
      });
    }

    //信息修改-男
    $(".infochange .head .mid .sexs>.nan").on("click", function () {
      $(".infochange .head .mid .sexs>div").removeClass("nowsex");
      $(this).addClass("nowsex");
      temp_gender = 0;
    });

    //信息修改-女
    $(".infochange .head .mid .nv").on("click", function () {
      $(".infochange .head .mid .sexs>div").removeClass("nowsex");
      $(this).addClass("nowsex");
      temp_gender = 1;
    });

    //信息修改-头像切换
    $(".infochange .headback").on("click", function () {
      ++temp_headid;
      let cgflg = false;
      let img = $(this).children("img")[0];
      anime.remove(img);
      anime({
        targets: img,
        scale: [1, 1.2],
        opacity: [1, 0],
        direction: "alternate",
        duration: 200,
        easing: "linear",
        changeComplete: function () {
          if (!cgflg) {
            $(img).attr("src", "../static/img/HeadImgs/an" + temp_headid + ".png");
            cgflg = true;
          }
        },
      });
      if (temp_headid > 16) temp_headid = 1;
    });

    //创建房间按钮
    $("#createroom").on("click", function () {
      $(".rsetting").fadeIn(500).css("display", "flex");
    });

    $(".roombox .section .rooms .item")
      .on("mouseover", function (e) {
        $(this).children(".iconfont").removeClass("icon-closedoor").addClass("icon-opendoor");
      })
      .on("mouseout", function (e) {
        $(this).children(".iconfont").removeClass("icon-opendoor").addClass("icon-closedoor");
      });

    //房间设置-房间锁滑块
    $("#roomlock").on("click", function () {
      let readonly = $("#setroompwd").attr("readonly") == "readonly";
      if (readonly) {
        $("#setroompwd").removeAttr("readonly").css("background-color", "white");
      } else {
        $("#setroompwd").val("").attr("readonly", "readonly").css("background-color", "#eee");
      }
    });

    //房间设置-退出
    $("#rsetting-quit").on("click", function () {
      $(".rsetting").fadeOut(500);
    });

    //广播发送-字数联动
    $("#putradio").on("keyup", function (e) {
      $("#rembyte").text((<string>$(this).val()).length);
    });

    //确认房间配置按钮
    $("#rsetting-createroom").on("click", function () {
      var obj = {
        lok: $("#setroompwd").attr("readonly") == "readonly",
        pwd: <string>$("#setroompwd").val(),
        bs: <number>$("#setbtscore").val(),
      };
      var patt = /^\d{4,8}$/;

      if (!obj.lok) {
        if (!patt.test(obj.pwd)) {
          Tools.shwoPrompt("房间密码只能是4~8位数字");
          return;
        }
      }
      if (obj.bs < 10 || obj.bs > 1000) {
        Tools.shwoPrompt("房间底分只能是10~1000");
        return;
      }
      event.emit(Event_创建房间, obj);
    });
  }

  /**字数限制 */

  /**绑定事件 */
  export function addEventLinstener(ev: string, fn: (...ags: any[]) => void) {
    event.on(ev, fn);
  }

  /**删除事件 */
  export function removeLinstener(ev?: string, fn?: (...ags: any[]) => void) {
    if (fn && ev) {
      event.removeListener(ev, fn);
    } else if (ev && !fn) {
      event.removeAllListeners(ev);
    } else {
      event.removeAllListeners();
    }
  }

  /**弹出信息修改面板 */
  export function showChangeInfoPanel() {
    let text = <string>$("#icname").val();
    $(".infochange").fadeIn(500).css("display", "flex");
    $("#icrole").attr("src", $("#prole").attr("src"));
    $("#ichead").attr("src", $("#phead").attr("src"));
    $("#icname").val($("#pname").text().replace("昵称: ", ""));
    $(".infochange .mid .sexs>div").removeClass("nowsex");
    $($("#psex").hasClass("icon-nan") ? "#icsex-nan" : "#icsex-nv").addClass("nowsex");
  }
}

export default HomeUi;
