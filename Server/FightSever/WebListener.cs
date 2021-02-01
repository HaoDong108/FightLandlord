using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using System.Web;
using System.Threading;
using System.IO;

namespace FightLand_Sever
{
    /*
     * 端口约定:
     *  8080:http 文件请求端口
     *  8081: webSocket 游戏指令推送端口
     *  
     */
    static class WebListener
    {
    
        static HttpListener fileListener = new HttpListener(); //监听文0件请求
        
        static string ProjectsDir = @"D:\Desktop\Work\ServerOrWeb\FightLandlord\Web\dist";
        static string RootDir = @"D:\Desktop\Work\ServerOrWeb\FightLandlord\Web";
        static bool stopped = true;
        static string ip = "127.0.0.1";

        /// <summary>
        /// 指示是否已启动监听
        /// </summary>
        public static bool IsStopped { get { return stopped; } }

        static WebListener()
        {
            var ips = Dns.GetHostAddresses(Dns.GetHostName());
            var ip = ips[ips.Length - 1];
            fileListener.Prefixes.Add("http://127.0.0.1:8080/");
            fileListener.AuthenticationSchemes = AuthenticationSchemes.Anonymous;
        }

        /// <summary>
        /// 启动http监听 以及websocket监听
        /// </summary>
        public static void  StartListen ()
        {
            Log.Print("WebListener监听器已启动...");
            stopped = false;
            fileListener.Start();
            Listen();
        }

        /// <summary>
        /// 释放资源并关闭所有连接
        /// </summary>
        public static void Dispose()
        {
            Log.Print("监听器已被释放");
            if (IsStopped) StopListen();
            fileListener.Abort();
            fileListener.Close();
        }

        /// <summary>
        /// 停止http监听 以及websocket连接
        /// </summary>
        public static void StopListen()
        {
            Log.Print("监听器已停止");
            stopped = true;
            fileListener.Stop();
        }

        //异步监听http请求
        private static async void Listen()
        {
            try
            {
                var ctx = await fileListener.GetContextAsync();
                if (stopped) return;
                ThreadPool.QueueUserWorkItem(RequestHandle, ctx);
                Listen();
            }
            catch (Exception)
            {
                stopped = false;
                Console.WriteLine("Http监听器已被停止");
                return;
            }
        }

        //http文件请求处理方法
        private static void RequestHandle(object obj)
        {
            var ctx = (HttpListenerContext)obj;
            var rq = ctx.Request; //请求体
            var rp = ctx.Response;//返回体
            var stream = rp.OutputStream;
            switch (rq.HttpMethod)
            {
                case "GET":
                    GET_HttpMethonHandle(ctx);
                    break;
                case "POST":
                    POST_HttpMethonHandle(ctx);
                    break;
                default:
                    rp.StatusCode = 501;
                    byte[] by = Encoding.UTF8.GetBytes("501 服务器对该请求方法不支持");
                    rp.ContentType = MimeMapping.GetMimeMapping(".txt") + ";charset=UTF-8";
                    rp.ContentLength64 = by.Length;
                    stream.Write(by, 0, by.Length);
                    rp.Close();
                    break;
            }
        }

        private static void GET_HttpMethonHandle(HttpListenerContext ctx)
        {
            var rq = ctx.Request;
            var rp = ctx.Response;
            var stream = rp.OutputStream;
            string path = rq.Url.AbsolutePath; //请求路径
            path = path.Replace("/", "\\");   //格式化请求路径
            string fullpath = ProjectsDir + path; //项目目录
            //如果为静态资源则返回到根目录寻找
            if (path.StartsWith("\\static")) fullpath = RootDir + path;
            //若请求路径为空返回主页
            if (path == "\\") fullpath = Path.Combine(ProjectsDir, "home.html");
            //检测资源是否存在  `
            if (File.Exists(fullpath))
            {
                if (path.Contains("game.html"))
                {
                    var ls = rq.QueryString.AllKeys;
                    bool get = false; //标识是否应该返回页面
                                      //判断是否附带合理请求参数
                    if (ls.Length == 2 && ls.Contains("roomid") && ls.Contains("pid"))
                    {
                        //获取检测信息
                        string pid = rq.QueryString.Get("pid");
                        string rmid = rq.QueryString.Get("roomid");
                        //（过滤恶意请求）
                        //判断该玩家是否在线
                        if (Management.HasPlayerInOnline(pid))
                        {
                            //判断玩家是否已经连接到了房间
                            var p = Management.GetOnlinePlayer(pid);
                            if (!p.ConnectRoom) get = true;
                        }
                    }
                    //不满足条件则重定向
                    if (!get)
                    {
                        rp.SendRedirect("http://" + ip + ":8080/");
                        return;
                    }
                }
                rp.Return200(fullpath);
            }
            else
            {
                Log.Print("请求的资源不存在" + fullpath);
                rp.Return404();
            }
        }

        private static void POST_HttpMethonHandle(HttpListenerContext ctx)
        {

        }

        //网页重定向
        private static void SendRedirect(this HttpListenerResponse rp, string url)
        {
            rp.StatusCode = 302;
            rp.AddHeader("Location", url);
            rp.Close();
        }

        private static void Return404(this HttpListenerResponse rp)
        {
           
            rp.StatusCode = 404;
            byte[] by = Encoding.UTF8.GetBytes("404 请求资源不存在");
            rp.ContentType = MimeMapping.GetMimeMapping(".txt") + ";charset=UTF-8";
            rp.ContentLength64 = by.Length;
            rp.OutputStream.Write(by, 0, by.Length);
            rp.Close();
        }

        private static void Return200(this HttpListenerResponse rp,string fullpath)
        {
            rp.StatusCode = 200;
            byte[] by = GetFileData(fullpath);
            rp.ContentType = MimeMapping.GetMimeMapping(fullpath) + ";charset=UTF-8";
            rp.ContentLength64 = by.Length;
            rp.OutputStream.Write(by, 0, by.Length);
            rp.Close();
        }

        //返回路径下的byte数据
        private static byte[] GetFileData(string fullpath)
        {
            using (FileStream fs = new FileStream(fullpath, FileMode.Open, FileAccess.Read))
            {
                byte[] bys = new byte[fs.Length];
                fs.Read(bys, 0, bys.Length);
                return bys;
            }
        }
    }
}
