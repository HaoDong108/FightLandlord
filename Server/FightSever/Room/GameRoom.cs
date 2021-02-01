using FightLand_Sever.Model.Net;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Room
{
    class GameRoom
    {
        public delegate void RoomPlayerEventHandler(GameRoom sender, MasterChangeEventArgs e);

        /// <summary>
        /// 房间玩家已到齐
        /// </summary>
        public event EventHandler RoomFill;

        /// <summary>
        /// 房间玩家已全部到齐且准备
        /// </summary>
        public event EventHandler AllReady;

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
        public string RoomID { get; private set; }
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

        bool onStart = false;
        List<Player> players = new List<Player>();

        public GameRoom(Player master, int btScore, string pwd = "")
        {
            this.RoomID = (ids++).ToString();
            this.BtScore = btScore;
            master.IsRoomMaster = true;
            master.RoomSokDisconnect += PlayerDisconnect;
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

        private void PlayerDisconnect(object sender, EventArgs e)
        {
            var p = sender as Player;
            p.OnReady = false;
            if (this.players.Count == 1)
            {
                if (this.RoomDestroy!=null) this.RoomDestroy(this, new EventArgs());
                return;
            }
            if (this.players.Count > 1 && p.IsRoomMaster)
            {
                var np = players.Where(r => r.PlayerID != p.PlayerID).First();
                this.RoomMaster = np;
                p.IsRoomMaster = false;
                np.IsRoomMaster = true;
                if (this.MasterChange != null) this.MasterChange(this, new MasterChangeEventArgs(p, np));
                return;
            }
        }

        /// <summary>
        /// 将指定玩家设置为准备状态
        /// </summary>
        /// <param name="p"></param>
        public void SetReady(Player p)
        {
            p.OnReady = true;
            if(AllReady != null&&
                players.Count==3 &&
               players.All(e => e.OnReady))
            {
                AllReady(this, new EventArgs());
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
            p.RoomSokDisconnect += PlayerDisconnect;
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


    class RoomErrorEventArgs:EventArgs
    {
        
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
