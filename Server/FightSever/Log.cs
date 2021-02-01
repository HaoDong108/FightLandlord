using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever
{
    static class Log
    {
        readonly static object lockprint = new object();
        /// <summary>
        /// 输出信息到控制台
        /// </summary>
        public static void Print(string mes, ConsoleColor cor = ConsoleColor.White)
        {
            lock (lockprint)
            {
                Console.ForegroundColor = ConsoleColor.DarkCyan;
                Console.Write(DateTime.Now.ToLongTimeString() + " :\n");
                Console.ForegroundColor = cor;
                Console.WriteLine(mes + "\n");
            }
        }

        /// <summary>
        /// 输出警告
        /// </summary>
        /// <param name="mes"></param>
        public static void PrintWarn(string mes)
        {
            Print("[Warning]\n" + mes, ConsoleColor.DarkYellow);
        }

        /// <summary>
        ///  异常记录
        /// </summary>
        public static void WriteExp(Exception e)
        {
            Print(e.Message, ConsoleColor.Red);
        }
    }
}
