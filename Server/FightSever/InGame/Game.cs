using FightLand_Sever.Model.Net;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Threading;

namespace FightLand_Sever.InGame
{
    enum GameStage
    {
        准备阶段,
        叫分阶段,
        设置地主阶段,
        出牌阶段,
        接牌阶段,
        结束阶段,
        统计阶段
    }
    class Game
    {
        /// <summary>
        /// 游戏结束
        /// </summary>
        public event EventHandler GameEnd;

        private static long id = 3001;
        /// <summary>
        /// 游戏ID
        /// </summary>
        public string GameID { get; private set; }
        /// <summary>
        /// 指示玩家是否已到齐
        /// </summary>
        public bool Dodge { get; set; }
        /// <summary>
        /// 当前局内倍数
        /// </summary>
        public int Multiple
        {
            get
            {
                return this.multiple;
            }
            set
            {
                this.multiple = value;
                //更新倍数信息
                this.SendBase(GameOrderType.倍数更新, "", null, value.ToString());
            }
        }

        public int readyCount = 0;  //已经准备的游戏玩家
        Player p1 = null;
        Player p2 = null;
        Player p3 = null;
        Player maxScorePly = null; //当前叫分分值最大玩家,即地主玩家
        Player lastSendPly = null;//上次出牌的玩家
        Player[] farmers = new Player[2]; //农民玩家
        Clock clock = new Clock(30); //计时器
        PokerHeap pokerHeap = new PokerHeap();
        GameStage gameStage = GameStage.准备阶段;
        int maxScore = 0; //当前最大叫分
        int lun = 0; //轮数
        int btScore = 1; //当局底分
        int multiple = 1; //当局倍数

        public Game(Player p1, Player p2, Player p3,int btScore)
        {
            this.GameID = (id++).ToString();
            this.Dodge = false;
            this.clock.TikChange += Clock_TikChange;
            this.clock.Stopped += Clock_Stopped;
            this.clock.OverTime += Clock_OverTime;
            this.btScore = btScore;
            this.p1 = p1;
            this.p2 = p2;
            this.p3 = p3;
            p1.OnGameData += GameSokReceive;
            p2.OnGameData += GameSokReceive;
            p3.OnGameData += GameSokReceive;
        }

        //收到玩家局内数据时触发
        private void GameSokReceive(Player ply, NetInfoBase info)
        {
            switch ((GameOrderType)info.OrderType)
            {
                case GameOrderType.有玩家叫分:
                    {
                        int score = int.Parse(info.Tag);
                        this.SomeoneJiaofen(ply, score);
                        break;
                    }
                case GameOrderType.出牌:
                    {
                        var p = JsonConvert.DeserializeAnonymousType(info.JsonData, new { pks = new NetPoker[0], type = OutPokerType.Error_Card });
                        OutPokerType ty = p.type;
                        if (ty == OutPokerType.炸弹 || ty == OutPokerType.王炸) this.Multiple *= 2;
                        this.SomeoneOutPoker(ply, p.pks);
                        break;
                    }
                case GameOrderType.玩家已准备:
                    {
                        this.readyCount++;
                        if (readyCount >= 3) AllPlayerReady();
                        break;
                    }
            }
        }

        //超时触发
        private void Clock_OverTime(Clock clock)
        {
            var ply = clock.TagPlayer;
            switch (this.gameStage)
            {
                case GameStage.叫分阶段:
                    this.SomeoneJiaofen(ply, 0);
                    break;
                case GameStage.出牌阶段:
                    var pks = new NetPoker[] { clock.TagPlayer.handPk[0] };
                    ply.handPk.RemoveAt(0);
                    this.SomeoneOutPoker(ply, pks);
                    break;
                case GameStage.接牌阶段:
                    this.SomeoneOutPoker(ply, new NetPoker[0]);
                    break;
            }
        }

        //计时器被中止时触发
        private void Clock_Stopped(Clock sender)
        {

        }

        //计时变更时触发
        private void Clock_TikChange(Clock sender, int nowtik)
        {
            this.SendBase(GameOrderType.计时滴答, "", null, nowtik.ToString());
        }

        //玩家掉线时触发
        private void PlayerDisconnect(object sender, EventArgs e)
        {
            Player p = sender as Player;
            if (p == this.p1) this.p1 = null;
            if (p == this.p2) this.p2 = null;
            if (p == this.p3) this.p3 = null;
            clock.DelClock();
        }

        //玩家全部准备后调用
        private void AllPlayerReady()
        {
            //洗牌
            this.pokerHeap.Shuffle();
            //获取随机后的牌堆(51张,不包括地主牌)
            var hep = this.pokerHeap.randHeap;
            //分别给出17张
            var h1 = hep.Take(17).ToArray();
            var h2 = hep.Skip(17).Take(17).ToArray();
            var h3 = hep.Skip(34).ToArray();
            this.p1.AddHandPk(h1);
            this.p2.AddHandPk(h2);
            this.p3.AddHandPk(h3);
            var p1h = JsonConvert.SerializeObject(h1);
            var p2h = JsonConvert.SerializeObject(h2);
            var p3h = JsonConvert.SerializeObject(h3);

            this.SendBase(GameOrderType.发我方手牌, p1h, this.p1);
            this.SendBase(GameOrderType.发我方手牌, p2h, this.p2);
            this.SendBase(GameOrderType.发我方手牌, p3h, this.p3);

            int ran = new Random().Next(0, 3);
            Player p = ran == 0 ? this.p1 : ran == 1 ? p2 : p3;
            string json = JsonConvert.SerializeObject(new
            {
                p.PlayerID,
                Min = 1 //指定最小叫分分值
            });
            this.clock.Start();
            clock.TagPlayer = p;
            this.gameStage = GameStage.叫分阶段;
            this.SendBase(GameOrderType.指定玩家叫分, json, null);
        }

        //有玩家叫分处理函数
        private void SomeoneJiaofen(Player ply, int score)
        {
            lun++;
            //判断当前叫分分值最高的玩家
            if (this.maxScore < score) { this.maxScore = score; this.maxScorePly = ply; }
            //向其他玩家发送叫分信息
            string json = JsonConvert.SerializeObject(new { ply.PlayerID, Score = score });
            this.SendBase(GameOrderType.有玩家叫分, json, ply.LastPlayer);
            this.SendBase(GameOrderType.有玩家叫分, json, ply.NextPlayer);
            //判断叫分阶段是否应该结束
            if (this.maxScore == 3 || (this.lun == 3 && this.maxScore > 0))
            {
                this.clock.Stop();
                this.JiaoFenOver();
                return;
            }
            if (lun == 3 && this.maxScore == 0)
            {
                this.clock.Stop();
                this.GameOver();
                return;
            }
            //如果不满足套件则继续指定下个玩家叫分,并指定最小叫分值
            json = JsonConvert.SerializeObject(new { ply.NextPlayer.PlayerID, Min = maxScore + 1 });
            this.SendBase(GameOrderType.指定玩家叫分, json, null);
            //重新开始计时
            clock.TagPlayer = ply.NextPlayer;
            clock.ReStart();
        }

        //叫分结束时调用
        private void JiaoFenOver()
        {
            this.gameStage = GameStage.设置地主阶段;
            this.Multiple = this.maxScore; //设置倍数为当前叫分倍数
            Log.Print("地主是:" + this.maxScorePly.Name);
            //给出地主牌信息
            string json = JsonConvert.SerializeObject(new { this.maxScorePly.PlayerID, LandPks = this.pokerHeap.landPks });
            this.maxScorePly.AddHandPk(this.pokerHeap.landPks.ToArray());
            //添加农民玩家
            this.farmers[0] = this.maxScorePly.LastPlayer;
            this.farmers[1] = this.maxScorePly.NextPlayer;
            this.SendBase(GameOrderType.设置地主, json);
            //设置完地主后准备进入出牌阶段,接收出牌信息
            clock.TagPlayer = this.maxScorePly;
            this.clock.Start(3);
            this.gameStage = GameStage.出牌阶段;
        }

        //有玩家出牌处理函数
        private void SomeoneOutPoker(Player ply, NetPoker[] pks)
        {
            if (pks == null) pks = new NetPoker[0];
            //向其他玩家给出出牌信息,客户端会根据信息决定是否轮到我方出牌
            string json = JsonConvert.SerializeObject(new { ply.PlayerID, OutPks = pks });
            this.SendBase(GameOrderType.出牌, json, ply.LastPlayer);
            this.SendBase(GameOrderType.出牌, json, ply.NextPlayer);
            //在服务器端删除扑克
            ply.RemoveHandPk(pks);
            if (ply.handPk.Count == 0)
            {
                this.gameStage = GameStage.结束阶段;
                this.SomeoneWin(ply);
                return;
            }
            //判断当前出牌的玩家是否还为上次出牌的玩家,如果是则说明其他玩家都不要,进入出牌阶段
            if (ply == this.lastSendPly) this.gameStage = GameStage.出牌阶段;
            else this.gameStage = GameStage.接牌阶段;
            if (pks.Length > 0) this.lastSendPly = ply;
            //重新计时
            this.clock.TagPlayer = ply.NextPlayer;
            this.clock.ReStart();
        }

        //当有玩家胜利时调用
        private void SomeoneWin(Player win)
        {
            //发送胜利信息
            var obj = JsonConvert.SerializeObject(new
            {
                Ply1ID = this.p1.PlayerID,
                Ply1Pks = this.p1.handPk,
                Ply2ID = this.p3.PlayerID,
                Ply2Pks = this.p3.handPk,
                Ply3ID = this.p2.PlayerID,
                Ply3Pks = this.p2.handPk,
                WinPlyID = win.PlayerID
            });
            this.SendBase(GameOrderType.有玩家胜出, obj);
            //结算玩家对局分数
            var sumScore = (long)this.multiple * this.btScore;
            if (maxScorePly == win)
            {
                maxScorePly.Mark += sumScore * 2;
                foreach (var p in farmers)
                {
                    p.Mark -= sumScore;
                }
            }
            else
            {
                win.Mark += sumScore;
                if (maxScorePly == win.LastPlayer)
                {
                    win.LastPlayer.Mark -= sumScore * 2;
                    win.NextPlayer.Mark += sumScore;
                }
                else
                {
                    win.LastPlayer.Mark += sumScore;
                    win.NextPlayer.Mark -= sumScore * 2;
                }
            }
            
        }

        //游戏结束
        private void GameOver()
        {
            this.gameStage = GameStage.结束阶段;
            if (this.GameEnd != null) this.GameEnd(this,new EventArgs());
            Log.Print("游戏结束", ConsoleColor.Red);
        }

        //发送数据给局内玩家
        private void SendBase(GameOrderType order, string json="", Player p = null, string tag = null)
        {
            if (p == null)
            {
                p1.SendRoomData(json, order, tag);
                p1.LastSendRoomData(json, order, tag);
                p1.NextSendRoomData(json, order, tag);
            }
            else
            {
                p.SendRoomData(json, order, tag);
            }
        }
    }
}
