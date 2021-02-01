using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever
{
    /// <summary>
    /// 玩家匹配队列静态对象
    /// </summary>
    static class MatchingQueue
    {
        /// <summary>
        /// 成功匹配3个玩家时触发
        /// </summary>
        public static event Action<Player[]> SuccessGroup;

        static List<Player> mqs = new List<Player>();

        /// <summary>
        /// 当前队列数量
        /// </summary>
        public static int Count
        {
            get { return mqs.Count; }
        }

        /// <summary>
        /// 检测是否有玩家匹配成功
        /// </summary>
        private static void Check()
        {
            lock (mqs)
            {
                while (mqs.Count >= 3)
                {
                    Player[] ps = new Player[3];
                    for (int i = 0; i < ps.Length; i++)
                    {
                        ps[i] = mqs[0];
                        mqs.RemoveAt(0);
                    }
                    if (SuccessGroup != null) SuccessGroup(ps);
                }
            }
        }

        /// <summary>
        /// 添加玩家到匹配队列
        /// </summary>
        /// <param name="p"></param>
        public static void Enqueue(Player p)
        {
            mqs.Add(p);
            Check();
        }

        /// <summary>
        /// 将指定玩家移出匹配队列
        /// </summary>
        /// <param name="pid"></param>
        public static bool Remove(string pid)
        {
            lock (mqs)
            {
                for (int i = 0; i < mqs.Count; i++)
                {
                    if (mqs[i].PlayerID == pid)
                    {
                        mqs.RemoveAt(i);
                        return true;
                    }
                }
            }
            return false;
        }
    }
}
