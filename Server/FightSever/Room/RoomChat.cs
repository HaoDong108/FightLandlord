using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebSocketSharp;
using WebSocketSharp.Server;
using FightLand_Sever.Model.Net;
using System.IO;
using Newtonsoft.Json;

namespace FightLand_Sever.Room
{
    class RoomChat : WebSocketBehavior
    {
        public delegate void OnMessageHandler(RoomChat sender, NetInfoBase e);
        public delegate void OnErrorHandler(RoomChat sender, WebSocketSharp.ErrorEventArgs e);

        public event OnMessageHandler OnGameData;
        public event EventHandler OnOpend;
        public event EventHandler OnClosed;
        public event OnErrorHandler OnErrord;

        /// <summary>
        /// 绑定的玩家
        /// </summary>
        public Player BindPlayer { get; set; }

        /// <summary>
        /// 绑定的房间
        /// </summary>
        public GameRoom BindRoom { get; set; }

        /// <summary>
        /// 标识连接是否已经断开
        /// </summary>
        public bool IsDisconnect { get { return base.Context.WebSocket.ReadyState != WebSocketState.Open; } }

        public RoomChat()
        {

        }

        protected override async Task OnClose(CloseEventArgs e)
        {
            if (this.OnClosed != null) this.OnClosed(this, new EventArgs());
            Log.Print("玩家" + this.BindPlayer.Name + "已经退出房间");
        }

        protected override async Task OnError(WebSocketSharp.ErrorEventArgs e)
        {
            if (this.OnErrord != null) this.OnErrord(this, e);
            Log.Print("房间内错误:" + e.Message);
        }

        protected override async Task OnOpen()
        {
            if (this.OnOpend != null) this.OnOpend(this, new EventArgs());
        }

        static readonly object connectLock = new object();
        protected override async Task OnMessage(MessageEventArgs e)
        {
            using (StreamReader sr = new StreamReader(e.Data))
            {
                string json = sr.ReadToEnd();
                NetInfoBase bas = JsonConvert.DeserializeObject<NetInfoBase>(json);
                string data = bas.JsonData;
                if (this.OnGameData != null)
                {
                    this.OnGameData(this, bas);
                }
                switch ((RoomOrderType)bas.OrderType)
                {
                    case RoomOrderType.连接到房间:
                        {
                            var obj = JsonConvert.DeserializeAnonymousType(data, new { roomid = "", pid = "" });
                            string pid = obj.pid;
                            string roomid = obj.roomid;
                            //找到对应房间
                            GameRoom room = Management.GetRoom(roomid);
                            if (room == null) return;
                            //判断是否添加玩家到房间
                            Player p = Management.GetOnlinePlayer(pid);
                            if (!room.HasPlayer(pid))
                            {
                                room.AddPlayer(p);
                            }
                            //绑定玩家到会话
                            this.BindPlayer = p;
                            RoomBinding(p.RoomWhich);
                            p.SetRoomWebSok(this);
                            //创建房间实体类
                            NetRoom nr = new NetRoom(room);
                            var dt = JsonConvert.SerializeObject(nr);
                            this.SendData(dt, (int)RoomOrderType.回送房间信息);
                            Log.Print("玩家" + this.BindPlayer.Name + "成功连接到房间");
                            //广播房主
                            BindRoom.BroadCast("", RoomOrderType.房主切换, BindRoom.RoomMaster.PlayerID);
                            break;
                        }
                    case RoomOrderType.玩家准备:
                        {
                            this.BindRoom.SetReady(this.BindPlayer);
                            this.BindPlayer.LastSendRoomData("", RoomOrderType.玩家准备, this.BindPlayer.PlayerID);
                            this.BindPlayer.NextSendRoomData("", RoomOrderType.玩家准备, this.BindPlayer.PlayerID);
                            break;
                        }
                }
            }
        }

        private void RoomBinding(GameRoom rom)
        {
            this.BindRoom = rom;
            rom.MasterChange += Rom_MasterChange;
        }

        private void Rom_MasterChange(GameRoom sender, MasterChangeEventArgs e)
        {
           sender.BroadCast("",RoomOrderType.房主切换, e.NewMaster.PlayerID);
        }

        /// <summary>
        /// 将字符串发送到客户端
        /// </summary>
        /// <param name="data"></param>
        public void SendData(string data, int order, string tag = "")
        {
            if (!this.IsDisconnect)
            {
                NetInfoBase info = new NetInfoBase(order, data,tag);
                var json = JsonConvert.SerializeObject(info);
                base.Send(json);
            }
        }

        /// <summary>
        /// 关闭与客户端的连接
        /// </summary>
        public void Colse()
        {
            base.Context.WebSocket.Close();
        }
    }
}
