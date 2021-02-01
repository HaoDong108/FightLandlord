using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace FightLand_Sever
{
    class Tools
    {

        /// <summary>
        /// 属性克隆
        /// </summary>
        public static void CloneProperty<T, V>(T tag, ref V from)
        {
            Type tagType = tag.GetType();
            Type fromType = from.GetType();
            foreach (var p in tagType.GetProperties())
            {
                foreach (var f in fromType.GetProperties())
                {
                    if (p.Name.Equals(f.Name) && p.PropertyType.FullName.Equals(f.PropertyType.FullName))
                    {
                        f.SetValue(from, p.GetValue(tag));
                    }
                }
            }
        }

        public static string GetLocalIP()
        {
            var ips = Dns.GetHostAddresses(Dns.GetHostName());
            var ip = ips[ips.Length - 1];
            return ip.ToString();
        }
    }
}
