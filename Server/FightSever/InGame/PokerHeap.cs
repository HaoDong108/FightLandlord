using FightLand_Sever.Model.Net;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever.InGame
{
    class PokerHeap
    {
        public List<NetPoker> heap = new List<NetPoker>();//初始序列牌堆
        public List<NetPoker> landPks = new List<NetPoker>(); //地主牌
        public List<NetPoker> randHeap = new List<NetPoker>();//随机牌堆,不包含地主牌

        public PokerHeap()
        {
            //有序插入牌堆初始值
            for (int i = 3; i <= 15; i++)
            {
                for (int j = 0; j <= 3; j++)
                {
                    this.heap.Add(new NetPoker(i, j));
                }
            }
            this.heap.Add(new NetPoker((int)PokerValue.joker_Small, (int)PokerFlower.spades));
            this.heap.Add(new NetPoker((int)PokerValue.joker_Big, (int)PokerFlower.heart));
            this.Shuffle();
        }

        private int GetRandomSeed()
        {
            byte[] bytes = new byte[4];
            System.Security.Cryptography.RNGCryptoServiceProvider rng = new System.Security.Cryptography.RNGCryptoServiceProvider();
            rng.GetBytes(bytes);
            return BitConverter.ToInt32(bytes, 0);
        }

        /// <summary>
        ///  洗牌,设置地主牌
        /// </summary>
        public void Shuffle()
        {
            this.landPks.Clear();
            this.randHeap.Clear();

            //随机出来的牌堆,不包含地主牌
            List<NetPoker> theap = new List<NetPoker>();
            theap.AddRange(this.heap);

            do
            {
                int rand = new Random(this.GetRandomSeed()).Next(0, theap.Count);
                NetPoker pk = theap[rand];
                theap.RemoveAt(rand);
                this.randHeap.Add(pk);
            } while (theap.Count>3);
            this.landPks.AddRange(theap);
        }
    }
}
