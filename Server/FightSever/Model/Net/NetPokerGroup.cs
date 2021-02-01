using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Model.Net
{
    class NetPokerGroup
    {
         public NetPoker[] Pks { get; set; }
         public int PlayerID { get; set; }

        public NetPokerGroup(NetPoker[] pks,int id)
        {
            this.Pks = pks;
            this.PlayerID = id;
        }
    }
}
