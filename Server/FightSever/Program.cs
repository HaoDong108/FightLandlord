using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using System.Threading.Tasks;
using System.Net.Http;
using System.Net;
using System.Threading;
using System.IO;
using System.Collections.Specialized;
using FightLand_Sever.Model.Net;

namespace FightLand_Sever
{
    class Program
    {
        static void Main(string[] args)
        {
            FireWall.NetFwAddPort("斗地主端口", 8080, "TCP");
            WebListener.StartListen();
            Management.StartListen();
            bool brek = false;
            while (true)
            {
                if (brek) break;
                switch (Console.ReadLine())
                {
                    case "clear": Console.Clear(); break;
                    case "exit":  brek = true;break;
                    default: break;
                }
            }
            WebListener.Dispose();
            FireWall.NetFwDelPort(8080, "TCP");
            Console.WriteLine("程序结束");
            Console.Read();
        }
    }
}
