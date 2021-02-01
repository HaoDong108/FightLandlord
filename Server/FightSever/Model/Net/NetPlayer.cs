using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Model.Net
{
    class NetPlayer
    {
        public string Name { get; set; }
        public string IP { get; set; }
        public string PlayerID { get; set; }
        public string HeadID { get; set; }
        public string Mark { get; set; }
        public string NextPlayerID { get; set; }
        public string LastPlayerID { get; set; }
        public int Gender { get; set; }
        public int RoleID { get; set; }
        public bool IsRoomMaster { get; set; }
        public bool OnReady { get; set; }

        public NetPlayer(Player p)
        {
            this.Name = p.Name;
            this.PlayerID = p.PlayerID;
            this.RoleID = p.RoleID;
            this.Mark = p.Mark.ToString();
            this.NextPlayerID = p.NextPlayer != null ? p.NextPlayer.PlayerID : "-1";
            this.LastPlayerID = p.LastPlayer != null ? p.LastPlayer.PlayerID : "-1";
            this.Gender = p.Gender;
            this.IP = p.IP;
            this.HeadID = p.HeadID.ToString();
            this.IsRoomMaster = p.IsRoomMaster;
            this.OnReady = p.OnReady;
        }
        public NetPlayer()
        {

        }
    }
}
