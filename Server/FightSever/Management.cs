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

        static WebSocketServer gameWs = null;

        static Timer saveTimer = new Timer(60000);//数据定时存储器

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
            GameRoom r = new GameRoom(p1, 100,RoomModels.Matched, "");
            r.AddPlayer(p2);
            r.AddPlayer(p3);
            rooms.Add(r.RoomID, r);
            //绑定房间
            p1.RoomWhich = p2.RoomWhich = p3.RoomWhich = r;
            r.AllReady += Room_AllReady;
            Log.Print("房间已生成:ID" + r.RoomID);
            //发送
            p1.HallWebsok.SendData(JsonConvert.SerializeObject(new { roomid = r.RoomID, pid = p1.PlayerID }), HallOrderType.房间创建完毕);
            p2.HallWebsok.SendData(JsonConvert.SerializeObject(new { roomid = r.RoomID, pid = p2.PlayerID }), HallOrderType.房间创建完毕);
            p3.HallWebsok.SendData(JsonConvert.SerializeObject(new { roomid = r.RoomID, pid = p3.PlayerID }), HallOrderType.房间创建完毕);
        }

        private static void Room_AllReady(object sender, EventArgs e)
        {
            var rom = sender as GameRoom;
            var pls = rom.GetPlayers();
            Game g = new Game(pls[0], pls[1], pls[2],rom.BtScore);
            onRuningGames.Add(g.GameID, g);
            g.GameEnd += (s, ev) =>
            {
                onRuningGames.Remove(g.GameID);
                g = null;
            };
            rom.BroadCast("", RoomOrderType.开始游戏指令);
        }

        private static void SaveTimer_Elapsed(object sender, ElapsedEventArgs e)
        {
            SaveAllPlayerData(); //保存玩家数据
            UpdateRankInfo(); //更新排名信息
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
            onLinePlayers.Add(p.PlayerID, p);
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
            rooms.Add(rom.RoomID, rom);
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
            if (rooms.ContainsKey(rid))
            {
                rooms.Remove(rid);
            }
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
        /// 更新所有玩家的排名信息
        /// </summary>
        private static void UpdateRankInfo()
        {
            var rks = GetAllPlayers().OrderBy(e => long.Parse(e.Mark)).ToArray();
            var json = JsonConvert.SerializeObject(rks);
            Task.Run(() =>
            {
                foreach (var p in onLinePlayers.Values)
                {
                    p.HallWebsok.SendData(json, HallOrderType.更新排名信息);
                }
            });
        }


        /// <summary>
        /// 判断玩家当前是否在线
        /// </summary>
        /// <param name="pid"></param>
        /// <returns></returns>
        public static bool HasPlayerInOnline(string pid)
        {
            return onLinePlayers.ContainsKey(pid);
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
