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
        public event Action<RoomChat> OnDisconnetc;
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
            if (this.OnDisconnetc != null) this.OnDisconnetc(this);
            Log.Print("玩家" + this.BindPlayer.Name + "已经退出房间");
        }

        protected override async Task OnError(WebSocketSharp.ErrorEventArgs e)
        {
            if (this.OnErrord != null) this.OnErrord(this, e);
            Log.Print("房间内错误:" + e.Message);
        }

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
                                p.RoomWhich = room;
                            }
                            //绑定玩家到会话
                            this.BindPlayer = p;
                            RoomBinding(p.RoomWhich);
                            p.SetRoomWebSok(this);
                            //创建房间实体类
                            NetRoom nr = new NetRoom(room);
                            //广播房间信息
                            room.BroadCast(JsonConvert.SerializeObject(nr), RoomOrderType.回送房间信息);
                            p.Jumping = false;
                            Log.Print("玩家" + this.BindPlayer.Name + "成功连接到房间");
                            break;
                        }
                    case RoomOrderType.玩家准备:
                        {
                            this.BindRoom.SetReady(this.BindPlayer);
                            this.BindPlayer.LastSendRoomData("", RoomOrderType.玩家准备, this.BindPlayer.PlayerID);
                            this.BindPlayer.NextSendRoomData("", RoomOrderType.玩家准备, this.BindPlayer.PlayerID);
                            break;
                        }
                    case RoomOrderType.踢出玩家:
                        {
                            var pid = bas.Tag;
                            if (Management.HasPlayerInOnline(pid))
                            {
                                Player p = Management.GetOnlinePlayer(pid);
                                p.Jumping = true;
                            }
                            this.BindRoom.BroadCast("", RoomOrderType.踢出玩家,pid);
                            //将玩家从房间删除
                            this.BindRoom.RemovePlayer(pid);
                            break;
                        }
                }
            }
        }

        //CallBack->玩家退出房间触发
        private void Room_PlayerDisconnect(GameRoom sender, Player ply)
        {
            sender.BroadCast("", RoomOrderType.玩家退出, ply.PlayerID);
            Management.OffLine(ply.PlayerID);
        }

        //CallBack->房主切换时触发
        private void Room_MasterChange(GameRoom sender, MasterChangeEventArgs e)
        {
            sender.BroadCast("", RoomOrderType.房主切换, e.NewMaster.PlayerID);
        }

        //绑定房间到会话
        private void RoomBinding(GameRoom rom)
        {
            this.BindRoom = rom;
            rom.MasterChange += Room_MasterChange;
            rom.PlayerDisconnect += Room_PlayerDisconnect;
        }

        /// <summary>
        /// 将字符串发送到客户端
        /// </summary>
        /// <param name="data"></param>
        public void SendData(string data, int order, string tag = "")
        {
            if (!this.IsDisconnect)
            {
                NetInfoBase info = new NetInfoBase(order, data, tag);
                var json = JsonConvert.SerializeObject(info);
                base.Send(json);
            }
        }
    }
}
