using FightLand_Sever.InGame;
using FightLand_Sever.Model.Net;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Room
{
    enum RoomModel
    {
        /// <summary>
        /// 匹配模式
        /// </summary>
        Matched,
        /// <summary>
        /// 房间模式
        /// </summary>
        Room,
    }
    class GameRoom
    {
        public delegate void RoomPlayerEventHandler(GameRoom sender, MasterChangeEventArgs e);
        /// <summary>
        /// 玩家断开与房间连接时触发
        /// </summary>
        public event Action<GameRoom, Player> PlayerDisconnect;

        /// <summary>
        /// 房间玩家已到齐
        /// </summary>
        public event EventHandler RoomFill;

        /// <summary>
        /// 房间销毁时触发
        /// </summary>
        public event EventHandler RoomDestroy;

        /// <summary>
        /// 房主变更时触发
        /// </summary>
        public event RoomPlayerEventHandler MasterChange;

        static long ids = 20001;
        /// <summary>
        /// 房间ID
        /// </summary>
        public long RoomID { get; private set; }
        /// <summary>
        /// 房间标题
        /// </summary>
        public string RoomTitle { get; set; }
        /// <summary>
        /// 房间密码
        /// </summary>
        public string RoomPwd { get; set; }
        /// <summary>
        /// 房间成员数
        /// </summary>
        public int MemberCount { get { return players.Count; } }
        /// <summary>
        /// 房主
        /// </summary>
        public Player RoomMaster { get; private set; }
        /// <summary>
        /// 指定房间的创建模式
        /// </summary>
        public RoomModel RoomModel { get; private set; }
        /// <summary>
        /// 房间底分
        /// </summary>
        public int BtScore { get; set; }
        /// <summary>
        /// 标识房间是否已将开始游戏
        /// </summary>
        public bool OnStart { get; private set; }
        /// <summary>
        /// 标识房间是否已到齐且全部准备
        /// </summary>
        public bool OnAllReady { get { return players.Count == 3 && players.All(e => e.OnReady); } }

        List<Player> players = new List<Player>();

        public GameRoom(Player master, int btScore, RoomModel mode, string pwd = "")
        {
            this.RoomID = (ids++);
            this.BtScore = btScore;
            this.RoomModel = mode;
            master.IsRoomMaster = true;
            master.RoomSokDisconnect +=GamerDisconnect;
            this.RoomMaster = master;
            this.RoomTitle = master.Name + "的房间";
            this.RoomPwd = pwd;
            this.RoomFill += Room_RoomFill;
            players.Add(master);
        }

        private void Room_RoomFill(object sender,EventArgs e)
        {
            players[0].LastPlayer = players[2];
            players[0].NextPlayer = players[1];
            players[1].LastPlayer = players[0];
            players[1].NextPlayer = players[2];
            players[2].NextPlayer = players[0];
            players[2].LastPlayer = players[1];
        }

        private void GamerDisconnect(Player p)
        {
            p.OnReady = false;
            //玩家下线时触发事件
            if (this.PlayerDisconnect != null) this.PlayerDisconnect(this, p);
            //如果房间剩余多名玩家,则转交房主
            if (this.players.Count > 1)
            {
                if (p.IsRoomMaster)
                {
                    var np = players.Where(r => r.PlayerID != p.PlayerID).First();
                    this.RoomMaster = np;
                    p.IsRoomMaster = false;
                    np.IsRoomMaster = true;
                    if (this.MasterChange != null) this.MasterChange(this, new MasterChangeEventArgs(p, np));
                }
            }
            this.RemovePlayer(p.PlayerID);
        }

        /// <summary>
        /// 将指定玩家设置为准备状态
        /// </summary>
        /// <param name="p"></param>
        public void SetReady(Player p)
        {
            p.OnReady = true;
            if (players.Count==3 &&
               players.All(e => e.OnReady))
            {
                //开始游戏
                var pls = this.players;
                Game g = new Game(pls[0], pls[1], pls[2], this.BtScore,RoomID);
                Management.AddGame(g);
                g.GameEnd += (s, ev) =>
                {
                    Management.RemoveGame(g.GameID.ToString());
                    g = null;
                };
                this.BroadCast("", RoomOrderType.开始游戏指令);
            }
        }

        /// <summary>
        /// 添加玩家到房间
        /// </summary>
        /// <param name="p"></param>
        public void AddPlayer(Player p)
        {
            if (this.HasPlayer(p.PlayerID)) return;
            players.Add(p);
            p.RoomSokDisconnect += GamerDisconnect;
            if (RoomMaster.LastPlayer == null)
            {
                RoomMaster.LastPlayer = p;
                p.NextPlayer = RoomMaster;
            }
            else if (RoomMaster.NextPlayer == null)
            {
                RoomMaster.NextPlayer = p;
                p.LastPlayer = RoomMaster;
            }
            if (players.Count == 3)
            {
                RoomMaster.LastPlayer.LastPlayer = RoomMaster.NextPlayer;
                RoomMaster.NextPlayer.NextPlayer = RoomMaster.LastPlayer;
                if(this.RoomFill != null) this.RoomFill(this,new EventArgs());
            }
        }

        /// <summary>
        /// 从房间删除玩家
        /// </summary>
        /// <param name="pid"></param>
        public void RemovePlayer(string pid)
        {
            for (int i = 0; i < players.Count; i++)
            {
                var py = players[i];
                if (py.PlayerID == pid)
                {
                    py.OnReady = false;
                    py.IsRoomMaster = false;
                    players.RemoveAt(i);
                    return;
                }
            }
            //玩家全部退出时销毁房间
            if (MemberCount<=0)
            {
                if (this.RoomDestroy != null) this.RoomDestroy(this, new EventArgs());
            }
        }

        /// <summary>
        /// 获取房间内指定玩家,没有则返回空
        /// </summary>
        /// <param name="pid"></param>
        /// <returns></returns>
        public Player GetPlayer(string pid)
        {
            for (int i = 0; i < players.Count; i++)
            {
                if (players[i].PlayerID == pid) return players[i];
            }
            return null;
        }

        /// <summary>
        /// 获取房间内玩家实体对象
        /// </summary>
        /// <returns></returns>
        public List<NetPlayer> GetNetPlayers()
        {
            var list = new List<NetPlayer>();
            foreach (var item in this.players)
            {
                list.Add(new NetPlayer(item));
            }
            return list;
        }

        /// <summary>
        /// 获取房间玩家对象
        /// </summary>
        /// <returns></returns>
        public Player[] GetPlayers()
        {
            return players.ToArray();
        }

        /// <summary>
        /// 获取已经准备的玩家
        /// </summary>
        /// <returns></returns>
        public Player[] GetReadyPlayers()
        {
            return this.players.Where(e => e.OnReady).ToArray();
        }

        /// <summary>
        /// 确认玩家是否在房间中
        /// </summary>
        /// <param name="pid"></param>
        /// <returns></returns>
        public bool HasPlayer(string pid)
        {
            for (int i = 0; i < players.Count; i++)
            {
                if (players[i].PlayerID == pid) return true;
            }
            return false;
        }

        /// <summary>
        /// 将数据广播到房间内所有已经连到房间会话的玩家
        /// </summary>
        public void BroadCast(string data, RoomOrderType order, string tag = "")
        {
            foreach (var ply in this.players)
            {
                if (ply.ConnectRoom)
                {
                    ply.RoomWebsok.SendData(data, (int)order, tag);
                }
            }
        }
    }

    class MasterChangeEventArgs : EventArgs
    {
        /// <summary>
        /// 原房主
        /// </summary>
        public Player OldMaster { get; private set; }

        /// <summary>
        /// 新房主
        /// </summary>
        public Player NewMaster { get; private set; }

        public MasterChangeEventArgs(Player old,Player nw)
        {
            this.OldMaster = old;
            this.NewMaster = nw;
        }
    }
}
