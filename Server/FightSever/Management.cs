using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using WebSocketSharp;
using WebSocketSharp.Server;
using FightLand_Sever.InGame;
using FightLand_Sever.Hall;
using FightLand_Sever.Model.Net;
using Newtonsoft.Json;
using System.IO;
using System.Timers;
using FightLand_Sever.Room;

namespace FightLand_Sever
{
    static class Management
    {
        // 在线玩家列表(PlayerID:Player)
        static Dictionary<string, Player> onLinePlayers = new Dictionary<string, Player>();

        // 离线玩家列表,数据尚未保存
        static Dictionary<string, Player> offLinePlayers = new Dictionary<string, Player>();

        // 正在进行的游戏列表(GameID:Player)
        static Dictionary<string, Game> onRuningGames = new Dictionary<string, Game>();

        // 房间列表
        static Dictionary<string, GameRoom> rooms = new Dictionary<string, GameRoom>();

        // 所有玩家对象(IP:Player)
        static Dictionary<string, NetPlayer> allPlayers = new Dictionary<string, NetPlayer>();

        //正在进行下线倒计时的玩家
        static Dictionary<string, Clock> soonOffline = new Dictionary<string, Clock>();

        //WebSocket服务器对象
        static WebSocketServer gameWs = null;

        //数据定时存储器
        static Timer saveTimer = new Timer(60000);

        //定时向所有玩家推送房间排名信息
        //static Timer putInfoTimer = new Timer(3000);

        static string plysDataPath = Environment.CurrentDirectory + "\\PlayerDatas.json";//玩家数据文件

        static Management()
        {
            onLinePlayers = new Dictionary<string, Player>();
            onRuningGames = new Dictionary<string, Game>();
            //获取所有注册玩家数据
            ReadPlayers();
            //启动websocket服务
            gameWs = new WebSocketServer(IPAddress.Parse("127.0.0.1"), 8081);
            gameWs.AddWebSocketService<RoomChat>("/RoomChat");
            gameWs.AddWebSocketService<HallChat>("/HallChat");
            saveTimer.Elapsed += SaveTimer_Elapsed;
            MatchingQueue.SuccessGroup += MatchingQueue_SuccessGroup;
        }

        //CallBack->匹配成功一组玩家触发
        private static void MatchingQueue_SuccessGroup(Player[] plys)
        {
            //通知玩家匹配成功,随后相应客户端客户端发起ajax请求获取游戏界面
            var p1 = plys[0];
            var p2 = plys[1];
            //为他们创建房间,并添加到房间列表
            var p3 = plys[2];
            GameRoom room = new GameRoom(p1, 100, RoomModel.Matched, "");
            room.AddPlayer(p2);
            room.AddPlayer(p3);
            room.RoomDestroy += Room_RoomDestroy;
            AddRoom(room);
            //绑定房间
            p1.RoomWhich = p2.RoomWhich = p3.RoomWhich = room;
            Log.Print("房间已生成:ID" + room.RoomID);
            //指示匹配成功的玩家进行页面跳转
            p1.HallWebsok.SendData(JsonConvert.SerializeObject(new { roomid = room.RoomID, pid = p1.PlayerID }), HallOrderType.房间创建完毕);
            p2.HallWebsok.SendData(JsonConvert.SerializeObject(new { roomid = room.RoomID, pid = p2.PlayerID }), HallOrderType.房间创建完毕);
            p3.HallWebsok.SendData(JsonConvert.SerializeObject(new { roomid = room.RoomID, pid = p3.PlayerID }), HallOrderType.房间创建完毕);
        }

        //房间销毁时触发
        private static void Room_RoomDestroy(object sender, EventArgs e)
        {
            var room = sender as GameRoom;
            Log.Print("房间" + room.RoomID + "已销毁");
            RemoveRoom(room.RoomID.ToString());
        }

        //到达保存周期时触发
        private static void SaveTimer_Elapsed(object sender, ElapsedEventArgs e)
        {
            SaveAllPlayerData(); //保存玩家数据
        }

        //玩家连接断开时触发
        private static void PlayerDisConnect(Player sender)
        {
            Clock c = new Clock(3);
            c.Start();
            c.TagPlayer = sender;
            c.OverTime += (s) =>
            {
                Log.Print("已将玩家" + sender.Name + "下线");
                OffLine(sender.PlayerID);
                soonOffline.Remove(sender.PlayerID);
            };
            //将玩家添加进下线倒计时队列
            soonOffline.Add(sender.PlayerID, c);
        }

        //玩家成功连接到服务器时触发
        private static void PlayerConnect(Player sender)
        {
            //如果即将下线队列中有该玩家则停止计时并删除
            if (soonOffline.ContainsKey(sender.PlayerID))
            {
                soonOffline[sender.PlayerID].Stop().Del();
                soonOffline.Remove(sender.PlayerID);
                Log.Print("玩家" + sender.Name + "重连成功");
            }
        }

        //保存当前所有玩家的数据
        private static void SaveAllPlayerData()
        {
            if (allPlayers.Count == 0) return;
            foreach (var p in onLinePlayers.Values)
            {
                allPlayers[p.IP] = new NetPlayer(p);
            }
            foreach (var p in offLinePlayers.Values)
            {
                allPlayers[p.IP] = new NetPlayer(p);
            }
            var list = allPlayers.Values.ToList();
            string json = JsonConvert.SerializeObject(list);
            StreamWriter sw = new StreamWriter(plysDataPath, false, Encoding.UTF8);
            sw.WriteAsync(json);
            offLinePlayers.Clear(); //清除离线列表
            sw.Close();
            sw.Dispose();
        }

        //从本地json读取玩家数据
        private static void ReadPlayers()
        {
            allPlayers = new Dictionary<string, NetPlayer>();
            using (StreamReader sr = new StreamReader(plysDataPath))
            {
                string json = sr.ReadToEnd();
                if (json.Length == 0)
                {
                    sr.Close();
                    return;
                }
                var data = JsonConvert.DeserializeObject<List<NetPlayer>>(json);
                if (data == null)
                {
                    sr.Close();
                    return;
                }
                data.ForEach(e => { allPlayers.Add(e.IP, e); });
            }
        }

        #region 添加
        /// <summary>
        /// 添加玩家到在线列表
        /// </summary>
        /// <param name="p"></param>
        public static void AddToOnline(Player p)
        {
            if (onLinePlayers.ContainsKey(p.PlayerID)) return;
            onLinePlayers.Add(p.PlayerID, p);
            p.HallConnect += PlayerConnect;
            p.RoomSokConnect += PlayerConnect;
            p.HallSokDisconnect += PlayerDisConnect;
            p.RoomSokDisconnect += PlayerDisConnect;
        }

        /// <summary>
        /// 添加玩家到数据列表
        /// </summary>
        /// <param name="p"></param>
        public static void AddToData(NetPlayer p)
        {
            allPlayers.Add(p.IP, p);
        }

        /// <summary>
        /// 添加房间
        /// </summary>
        /// <param name="rom"></param>
        public static void AddRoom(GameRoom rom)
        {
            rooms.Add(rom.RoomID.ToString(), rom);
            rom.RoomDestroy += Room_RoomDestroy;
        }

        /// <summary>
        /// 添加游戏
        /// </summary>
        /// <param name="game"></param>
        public static void AddGame(Game game)
        {
            onRuningGames.Add(game.GameID.ToString(), game);
        }
        #endregion

        #region 删除
        /// <summary>
        /// 将指定玩家下线
        /// </summary>
        /// <param name="pid"></param>
        public static void OffLine(string pid)
        {
            //if (onLinePlayers.ContainsKey(pid))
            //{
            //    offLinePlayers.Add(pid, onLinePlayers[pid]); //将玩家添加到离线列表,将在下次数据保存后清空
            //    onLinePlayers.Remove(pid);
            //}
            onLinePlayers.Remove(pid);
        }

        /// <summary>
        /// 删除房间
        /// </summary>
        /// <param name="rid"></param>
        public static void RemoveRoom(string rid)
        {
            rooms.Remove(rid);
        }

        /// <summary>
        /// 删除游戏对局
        /// </summary>
        /// <param name="rid"></param>
        public static void RemoveGame(string rid)
        {

        }
        #endregion

        #region 获取
        /// <summary>
        /// 获取所有玩家数据列表
        /// </summary>
        /// <returns></returns>
        public static List<NetPlayer> GetAllPlayers()
        {
            return allPlayers.Values.ToList();
        }

        /// <summary>
        /// 获取房间对象
        /// </summary>
        /// <param name="roomid"></param>
        /// <returns></returns>
        public static GameRoom GetRoom(string roomid)
        {
            if (rooms.ContainsKey(roomid)) return rooms[roomid];
            else return null;
        }

        /// <summary>
        /// 获取所有房间
        /// </summary>
        /// <returns></returns>
        public static GameRoom[] GetRooms()
        {
            return rooms.Values.ToArray();
        }

        /// <summary>
        /// 获取指定玩家基本数据
        /// </summary>
        /// <param name="ip"></param>
        /// <returns></returns>
        public static NetPlayer GetPlayerData(string ip)
        {
            if (allPlayers.ContainsKey(ip)) return allPlayers[ip];
            return null;
        }

        /// <summary>
        /// 返回指定在线玩家
        /// </summary>
        /// <param name="pid"></param>
        /// <returns></returns>
        public static Player GetOnlinePlayer(string pid)
        {
            if (onLinePlayers.ContainsKey(pid)) return onLinePlayers[pid];
            return null;
        }
        #endregion

        /// <summary>
        /// 判断玩家当前是否在线
        /// </summary>
        /// <param name="pid"></param>
        public static bool HasPlayerInOnline(string pid)
        {
            return onLinePlayers.ContainsKey(pid);
        }

        /// <summary>
        /// 判断是否存在该房间
        /// </summary>
        /// <param name="rid"></param>
        /// <returns></returns>
        public static bool HasRoom(string rid)
        {
            return rooms.ContainsKey(rid);
        }

        /// <summary>
        /// 更新指定玩家的信息
        /// </summary>
        public static void UpdatePlayer(string pid, int headid, int roleid, int gender, string name)
        {
            if (!onLinePlayers.ContainsKey(pid)) return;
            var ply = onLinePlayers[pid];
            ply.Name = name;
            ply.RoleID = roleid;
            ply.Gender = gender;
            ply.HeadID = headid;
            Log.Print("成功修改");
        }

        /// <summary>
        /// 开始监听玩家
        /// </summary>
        public static void StartListen()
        {
            gameWs.Start();
            //saveTimer.Start();
            Log.Print("服务器已启动...");
        }

        /// <summary>
        /// 关闭服务器
        /// </summary>
        public static void Close()
        {
            gameWs.Stop();
        }
    }
}
