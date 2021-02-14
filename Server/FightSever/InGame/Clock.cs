using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Timers;

namespace FightLand_Sever.InGame
{
    class Clock
    {
        public delegate void TikEventHandler(Clock sender, int nowtik);
        public delegate void ClockBaseHandler(Clock sender);
        /// <summary>
        /// 计时器计时完毕后触发
        /// </summary>
        public event ClockBaseHandler OverTime;
        /// <summary>
        /// 计时器被停止时触发
        /// </summary>
        public event ClockBaseHandler Stopped;
        /// <summary>
        /// Tik被改变时触发
        /// </summary>
        public event TikEventHandler TikChange;

        private static List<Clock> clocks = new List<Clock>();
        private static Timer timer = new Timer() { Interval = 1000 };

        private bool isStoped = true;
        private int initTok;
        private bool delFlg = false;
        private int delay = 0;
        private int tik;
        public int Tik
        {
            get
            {
                return this.tik;
            }
            set
            {
                if (this.isStoped) return;
                if (this.delay > 0)
                {
                    delay--;
                    return;
                }
                if (this.tik != value && this.TikChange != null && value >= 0) this.TikChange(this, value);
                this.tik = value;
                if (this.tik <= -1)
                {
                    this.tik = this.initTok;
                    this.isStoped = true;
                    if (this.OverTime != null) this.OverTime(this);
                }
            }
        }

        public Player TagPlayer { get; set; }

        public Clock(int tik)
        {
            this.initTok = tik;
            this.tik = tik;
            clocks.Add(this);
        }

        static Clock()
        {
            timer.Elapsed += Timer_Elapsed;
            timer.Start();
        }

        private static void Timer_Elapsed(object sender, ElapsedEventArgs e)
        {
            for (int i = 0; i < clocks.Count; i++)
            {
                if (clocks[i].delFlg)
                {
                    clocks.RemoveAt(i);
                    --i;
                    continue;
                }
                clocks[i].Tik -= 1;
            }
        }

        /// <summary>
        /// 停止该计时器,并初始化tik
        /// </summary>
        public void Stop()
        {
            this.isStoped = true;
            this.tik = this.initTok;
            if (this.Stopped != null) this.Stopped(this);
        }

        /// <summary>
        /// 开始计时
        /// </summary>
        /// <param name="delayBySecond">延迟启动(秒)</param>
        public void Start(int delayBySecond = 0)
        {
            if (!this.isStoped) return;
            this.delay = delayBySecond;
            this.tik = this.initTok;
            this.isStoped = false;
        }

        /// <summary>
        /// 立即重新开始计时
        /// </summary>
        public void ReStart()
        {
            this.tik = this.initTok;
            this.isStoped = false;
        }

        /// <summary>
        /// 给闹钟设置删除标志
        /// </summary>
        public void Del()
        {
            this.delFlg = true;
        }
    }
}
