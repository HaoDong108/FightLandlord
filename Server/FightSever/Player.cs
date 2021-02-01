using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using FightLand_Sever.Model.Net;
using WebSocketSharp.Server;
using WebSocketSharp;
using System.Net;
using FightLand_Sever.InGame;
using FightLand_Sever.Hall;
using FightLand_Sever.Room;

namespace FightLand_Sever
{
    enum Roles
    {
        None,
        艾琳娜,
        卡神,
        贝儿,
        赛罗,
        小志,
        直树,
        锦伦,
        小燕,
    }

    class Player
    {
        static long id = 10001;

        #region 属性
        /// <summary>
        /// 玩家昵称
        /// </summary>
        public string Name { get; set; }
        /// <summary>
        /// 玩家IP
        /// </summary>
        public string IP { get; private set; }
        /// <summary>
        /// 玩家唯一ID
        /// </summary>
        public string PlayerID { get; private set; }
        /// <summary>
        /// 剩余金钱
        /// </summary>
        public long Mark { get; set; }
        /// <summary>
        /// 客户终端信息
        /// </summary>
        public IPEndPoint Ipend { get; private set; }
        /// <summary>
        /// 当前关联的游戏对象
        /// </summary>
        public Game Game { get; set; }

        /// <summary>
        /// 当前玩家所处的房间对象
        /// </summary>
        public GameRoom RoomWhich { get; set; }

        /// <summary>
        /// 房间内连接对象
        /// </summary>
        public RoomChat RoomWebsok { get; private set; }
        /// <summary>
        /// 大厅连接对象
        /// </summary>
        public HallChat HallWebsok { get; private set; }
        /// <summary>
        /// 上一个玩家=>左
        /// </summary>
        public Player LastPlayer{ get; set;}

        /// <summary>
        /// 下一个玩家=>右
        /// </summary>
        public Player NextPlayer { get; set; }
        /// <summary>
        /// 性别 0男 1女
        /// </summary>
        public int Gender { get; set; }
        /// <summary>
        /// 人物展示编号
        /// </summary>
        public int RoleID { get; set; }
        /// <summary>
        /// 头像编号
        /// </summary>
        public int HeadID { get; set; }
        /// <summary>
        /// 指示该玩家是否是房主
        /// </summary>
        public bool IsRoomMaster { get; set; }

        /// <summary>
        /// 指示玩家是否已准备
        /// </summary>
        public bool OnReady { get; set; }

        /// <summary>
        /// 指示玩家是否已经连接到房间
        /// </summary>
        public bool ConnectRoom { get { return (this.RoomWebsok != null&&!this.RoomWebsok.IsDisconnect); } }
        #endregion

        public event EventHandler RoomSokDisconnect;  //房间连接断开时触发
        public event Action<Player, NetInfoBase> OnGameData; //收到数据触发
        public List<NetPoker> handPk = new List<NetPoker>();


        public Player(HallChat hsok)
        {
            this.IsRoomMaster = false;
            this.IP = hsok.IP;
            this.HallWebsok = hsok;
            //默认信息
            this.Mark = 3000;
            this.PlayerID = id++.ToString();
            this.Name = "游客" + this.PlayerID;
            this.Gender = 0;
            this.HeadID = 1;
            this.RoleID = 1;
            this.IsRoomMaster = false;
        }

        public Player(HallChat hsok, NetPlayer p)
        {
            this.HallWebsok = hsok;
            this.IP = hsok.IP;
            this.Name = p.Name;
            this.PlayerID = p.PlayerID;
            this.RoleID = p.RoleID;
            this.Mark = long.Parse(p.Mark);
            this.Gender = p.Gender;
            this.IP = p.IP;
            this.HeadID = int.Parse(p.HeadID);
            this.IsRoomMaster = false;
        }

        /// <summary>
        /// 添加扑克手牌并按升序排序
        /// </summary>
        public void AddHandPk(NetPoker[] pks)
        {
            this.handPk.AddRange(pks);
            var arr = this.handPk.ToArray();
            this.handPk.Clear();
            var res = from a in arr orderby a.Value, a.Flower ascending select a;
            this.handPk.AddRange(res.ToArray());
        }

        /// <summary>
        /// 删除匹配的扑克
        /// </summary>
        public void RemoveHandPk(NetPoker[] pks)
        {
            foreach (var pk in pks)
            {
                for (int i = 0; i < this.handPk.Count; i++)
                {
                    if (pk.Value == this.handPk[i].Value && pk.Flower == this.handPk[i].Flower)
                    {
                        handPk.RemoveAt(i);
                        break;
                    }
                }
            }
        }

        /// <summary>
        /// 设置游戏连接对象
        /// </summary>
        /// <param name="chat"></param>
        public void SetRoomWebSok(RoomChat chat)
        {
            this.RoomWebsok = chat;
            chat.OnClosed += RoomChat_OnClosed;
            chat.OnGameData += (s, e) => { if(this.OnGameData!=null) this.OnGameData(this, e); };
        }

        public void SendRoomData(string data, RoomOrderType order, string tag = "")
        {
            this.RoomWebsok.SendData(data, (int)order, tag);
        }
        public void SendRoomData(string data,GameOrderType order,string tag = "")
        {
            this.RoomWebsok.SendData(data, (int)order, tag);
        }

        public void LastSendRoomData(string data, RoomOrderType order, string tag = "")
        {
            if (this.LastPlayer != null)
            {
                this.LastPlayer.SendRoomData(data, order, tag);
            }
        }
        public void LastSendRoomData(string data, GameOrderType order, string tag = "")
        {
            if (this.LastPlayer != null)
            {
                this.LastPlayer.SendRoomData(data, order, tag);
            }
        }

        public void NextSendRoomData(string data, RoomOrderType order, string tag = "")
        {
            if (this.NextPlayer != null)
            {
                this.NextPlayer.SendRoomData(data, order, tag);
            }
        }
        public void NextSendRoomData(string data, GameOrderType order, string tag = "")
        {
            if (this.NextPlayer != null)
            {
                this.NextPlayer.SendRoomData(data, order, tag);
            }
        }

        private void RoomChat_OnClosed(object sender, EventArgs e)
        {
            if (RoomSokDisconnect != null)
            {
                RoomSokDisconnect(this, new EventArgs());
            }
        }
    }
}
