using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Model.Net
{
    public enum HallOrderType
    {
        大厅基本数据 = 0,
        进入匹配队列,
        退出匹配队列,
        返回退出结果,
        获取房间列表,
        更新排名信息,
        获取房间成员,
        更新玩家信息,
        匹配成功,
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
    }
}
