using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using WebSocketSharp;
using WebSocketSharp.Server;
using Newtonsoft.Json;
using FightLand_Sever.Model.Net;
using FightLand_Sever.Room;

namespace FightLand_Sever.Hall
{
    class HallChat : WebSocketBehavior
    {
        /// <summary>
        /// 收到大厅操作指令时触发
        /// </summary>
        public event Action<HallChat, NetInfoBase> OnHallOrder;

        /// <summary>
        /// 玩家成功连接时触发
        /// </summary>
        public event Action<HallChat> OnConnect;

        /// <summary>
        /// 玩家断开连接时触发
        /// </summary>
        public event Action<HallChat> OnDisConnect;

        /// <summary>
        /// 玩家IP地址
        /// </summary>
        public string IP { get; private set; }

        /// <summary>
        /// 绑定的玩家
        /// </summary>
        public Player BindPlayer { get; private set; }


        public HallChat() { }

        /// <summary>
        /// 发送数据到客户端
        /// </summary>
        /// <param name="data"></param>
        /// <param name="type"></param>
        public void SendData(string data, HallOrderType type)
        {
            if (this.Context.WebSocket.ReadyState == WebSocketState.Open)
            {
                var bas = new NetInfoBase((int)type, data);
                string json = JsonConvert.SerializeObject(bas);
                base.Send(json);
            }
        }

        /// <summary>
        /// 发送大厅数据
        /// </summary>
        /// <param name="np"></param>
        /// <param name="isflogin"></param>
        private void SendHallData(NetPlayer np, bool isflogin)
        {
            var rks = Management.GetAllPlayers().OrderBy(k => k.Mark).ToArray();
            var obj = new
            {
                Player = np, //玩家信息
                Rank = rks,  //排名信息
                IsFirstLogin = isflogin //指示该玩家是否为第一次登陆
            };
            var json = JsonConvert.SerializeObject(obj);
            this.SendData(json, HallOrderType.大厅基本数据);
        }

        protected override async Task OnMessage(MessageEventArgs e)
        {
            using (var rs = new System.IO.StreamReader(e.Data))
            {
                string json = rs.ReadToEnd();
                NetInfoBase hallbase = JsonConvert.DeserializeObject<NetInfoBase>(json);
                Player ply = this.BindPlayer;
                json = hallbase.JsonData;
                if (hallbase != null && this.OnHallOrder != null)
                {
                    this.OnHallOrder(this, hallbase);
                }
                try
                {
                    switch ((HallOrderType)hallbase.OrderType)
                    {
                        case HallOrderType.进入匹配队列:
                            {
                                MatchingQueue.Enqueue(ply);
                                Log.Print("玩家" + this.BindPlayer.Name + "进入了匹配队列");
                                break;
                            }
                        case HallOrderType.退出匹配队列:
                            {
                                Log.Print("玩家" + this.BindPlayer.Name + "退出了匹配队列");
                                MatchingQueue.Remove(ply.PlayerID);
                                break;
                            }
                        case HallOrderType.更新玩家信息:
                            {
                                var info = JsonConvert.DeserializeAnonymousType(json, new
                                {
                                    name = "",
                                    roleid = 1,
                                    headid = 1,
                                    gender = 0,
                                });
                                Management.UpdatePlayer(ply.PlayerID, info.headid, info.roleid, info.gender, info.name);
                                break;
                            }
                        case HallOrderType.获取房间列表:
                            {
                                var roms = Management.GetRooms().Select(r =>
                                {
                                    return new NetRoom()
                                    {
                                        RoomID=r.RoomID,
                                        BtScore = r.BtScore,
                                        MasterName = r.RoomMaster.Name,
                                        MasterHead = r.RoomMaster.HeadID,
                                        NowCount = r.MemberCount,
                                    };
                                }).ToArray();
                                this.SendData(JsonConvert.SerializeObject(roms), HallOrderType.返回房间列表);
                                break;
                            }
                        case HallOrderType.创建房间:
                            {
                                var rom = JsonConvert.DeserializeAnonymousType(json, new {pwd = "", bts = 0 });
                                GameRoom room = new GameRoom(ply, rom.bts,RoomModels.Room, rom.pwd);
                                Management.AddRoom(room);
                                break;
                            }
                    }
                }
                catch (Exception ex)
                {
                    Log.Print(ex.Message, ConsoleColor.Red);
                }
            }
        }

        protected override async Task OnClose(CloseEventArgs e)
        {
            if (this.OnDisConnect != null) this.OnDisConnect(this);
            Log.Print("玩家" + this.BindPlayer.PlayerID + "大厅连接已断开");
        }

        protected override async Task OnError(ErrorEventArgs e)
        {
            Console.WriteLine("错误:" + e.Message);
        }

        protected override async Task OnOpen()
        {
            //绑定IP
            this.IP = base.Context.UserEndPoint.Address.ToString();
            Log.Print("玩家" + this.IP + "已连接到服务器");
            Log.Print("Hash:" + this.GetHashCode());

            //决定读取玩家或者添加新的玩家
            Player p = null;
            bool IsFirstLogin = false;
            ////如果玩家存不在数据表中则生成新的数据
            //if (!Management.hasPlayer(this.IP))
            //{
            //IsFirstLogin = true;
            p = new Player(this);
            //Management.AddToData(new NetPlayer(p));
            //}
            //else
            //{
            //p = new Player(this, Management.GetPlayerData(this.IP));
            //}
            //将玩家添加到当前在线列表
            Management.AddToOnline(p);
            //绑定该玩家
            this.BindPlayer = p;
            //发送大厅数据
            SendHallData(new NetPlayer(p), IsFirstLogin);
            if (this.OnConnect != null) this.OnConnect(this);
        }
    }
}
