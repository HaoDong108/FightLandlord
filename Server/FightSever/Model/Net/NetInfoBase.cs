﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Model.Net
{
    public enum HallOrderType
    {
        请求大厅数据=0,
        返回大厅数据,
        进入匹配队列,
        退出匹配队列,
        返回退出结果,
        获取房间成员,
        更新玩家信息,
        房间创建完毕,
        请求进入房间,
        请求房间列表,
        推送房间列表,
        请求排名信息,
        推送排名信息,
        创建房间,
    }
    public enum RoomOrderType
    {
        连接到房间 = 100,
        回送房间信息,
        添加玩家,
        开始游戏指令,
        玩家准备,
        玩家退出,
        玩家加入,
        踢出玩家,
        房主切换,
    }
    enum GameOrderType
    {
        空 = 200,
        玩家已准备,
        出牌,
        发我方手牌,
        发地主牌,
        回送玩家信息,
        不要,
        有其他玩家叫分,
        指定玩家叫分,
        有玩家叫分,
        计时滴答,
        设置地主,
        有玩家胜出,
        倍数更新,
    }
   
    class NetInfoBase
    {
        /// <summary>
        /// 类型
        /// </summary>
        public int OrderType { get; set; }

        /// <summary>
        /// 对象数据
        /// </summary>
        public string JsonData { get; set; }

        /// <summary>
        /// 用于存储简单数据
        /// </summary>
        public string Tag { get; set; }

        public NetInfoBase(int type,string json,string tag=null)
        {
            this.OrderType = type;
            this.JsonData = json;
            this.Tag = tag;
        }

        /// <summary>
        /// 返回Json对象
        /// </summary>
        public static string GetJson(int type, string json, string tag = "")
        {
            NetInfoBase bas = new NetInfoBase(type, json, tag);
            return Newtonsoft.Json.JsonConvert.SerializeObject(bas);
        }
    }
}
