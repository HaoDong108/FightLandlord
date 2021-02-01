using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.Model.Net
{
    enum PokerValue
    {
        three = 3,
        four,
        five,
        six,
        seven,
        eight,
        nine,
        ten,
        J,
        Q,
        K,
        A,
        two,
        joker_Small,
        joker_Big
    }

    enum PokerFlower
    {
      /// <summary>
      /// 黑桃
      /// </summary>
        spades,
        /// <summary>
        /// 红桃
        /// </summary>
        heart,
       /// <summary>
       /// 梅花
       /// </summary>
        clubs,
       /// <summary>
       /// 方块
       /// </summary>
        dianmond
    }

    /// <summary>
    /// 出牌牌型枚举
    /// </summary>
    enum OutPokerType
    {
        单,
        顺子,
        对子,
        连对,
        三张,
        三带一,
        三带一对,
        飞机,
        飞机带翅膀,
        炸弹,
        四带二,
        王炸,
        Error_Card
    }

    /// <summary>
    /// 扑克传输实体类
    /// </summary>
    class NetPoker
    {
        public int Value { get; set; }
        public int Flower { get; set; }

        public NetPoker(int v, int f)
        {
            this.Value = v;
            this.Flower = f;
        }
    }
}
