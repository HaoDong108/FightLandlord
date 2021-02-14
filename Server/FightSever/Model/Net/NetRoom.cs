using FightLand_Sever.Room;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Model.Net
{
    class NetRoom
    {
        public List<NetPlayer> Players { get; set; }
        public string RoomID { get; set; }
        public int BtScore { get; set; }
        public string Title { get; set; }
        public bool OnStart { get; set; }
        public string MasterID { get; set; }
        public string MasterName { get; set; }
        public int MasterHead { get; set; }
        public int NowCount { get; set; }
        public int RoomMode { get; set; }

        public NetRoom(){}
        public NetRoom(GameRoom rom)
        {
            this.RoomID = rom.RoomID.ToString();
            this.Title = rom.RoomTitle;
            this.OnStart = rom.OnStart;
            this.Players = rom.GetNetPlayers();
            this.BtScore = rom.BtScore;
            this.NowCount = rom.MemberCount;
            this.RoomMode = (int)rom.RoomModel;
            this.MasterName = rom.RoomMaster.Name;
            this.MasterHead = rom.RoomMaster.HeadID;
            this.MasterID = rom.RoomMaster.PlayerID;
        }
    }
}
