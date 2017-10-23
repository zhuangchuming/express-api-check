要求：
1、所有的接口文档都需要以正确的json文件编写，否则出现解析错误，无法对接口进行解析；
2、接口文档都放置在interFaceRoot的目录下；

客户端设置：
POST、DELETE、PUT、PATCH等的请求，需要带上请求头：Content-Type:application/json; charset=UTF-8


尚未完善的地方：
1、没有对GET请求的参数进行一个验证，所以在GET参数中，不能设置 type等，只能设置need



接口文档命名规则以及对应的路由：(按这个顺序去找文件目录)
1、路由名字为接口文档的名字；
2、路由的方法名+'_'+路由名；
	eg: add.json、 add_GET.json 、add_POST.json 、add_DELETE.json, //add是我的路由名字
		add.json 这个文件由于没有设置是哪个请求文件，故需要在add.json文件中的"method"方法中标明
		eg : add.json文件是这么设置的 "method":"GET"，如下：

		express:例子
			router.route('add')
				.post((req,res)=>{ //这个对应add_POST.json 这个文件

				})
				.delete((req,res)=>{ //这个对应add_DELETE.json 这个文件

				})
				.get((req,res)=>{ //这个对应add.json

				})

		koa:例子
			router.post('add',(req,res)=>{ //这个对应add_POST.json 这个文件

				})
				.delete('add',(req,res)=>{ //这个对应add_DELETE.json 这个文件

				})
				.get('add',(req,res)=>{ //这个对应add.json

				})

使用如下：
1、在app.js中初始化：
var authInit = require('./lib/ITFAuth').authInit;//先把接口验证文档引入
let interFaceRoot = path.join(__dirname, '../gaomuxuexi-interface-desc/gaomuxuexi-app-student-server/');//指定当前服务器接口目录地址
let itCFace = path.join(__dirname,'/routes/itCount.json');//指定一个接口调用统计文件目录
/*
*参数1、interFaceRoot 接口文档目录
*参数2、itCFace 接口调用统计目录
*参数3、接口授权访问的时候,授权未通过时可以特殊处理授权的调用方法 
*		传入的参数：express(req),koa(ctx)
*		方法返回值：true/false 指的是，是否通过授权
*		该参数的适用场景  eg：单点登录,通过调用接口登录成功后设置 session；
*参数4、设置是否为调试模式 (调试模式下，接口文档会实时读取)，发布正式版本的时候设置为false,默认为false
*/
authInit(interFaceRoot,itCFace,null,true);//初始化接口检测功能

2、在路由的index目录中，把需要对接口进行请求认证的，放在const paramsOauth = require('../lib/authUtils').paramsOauth;这个中间件的后面即可。
如下：
***const paramsOauth = require('../lib/authUtils').paramsOauth;
***router.use(paramsOauth);//以下所有接口中需要对接口进行认证
***之后，所有的路由都必须写在上面的中间件以下，才能使用如下的功能



接口文档参数说明如下：

method:指定请求方法
{
	作用：
		指定请求的方法 

	格式：
		"method":"POST", "method":"GET"、"PATCH"、"PUT"、"DELETE"等等
	注意：
		get请求如果没有指定json文档，那么默认不对接口进行认证，这是因为服务器开发的时候可能会经常使用到模板，渲染一个模板完全没有必要去写一个接口文档。
}

params :参数下的类型定义
{
	1、enum：枚举型
	作用：
		指定值的所在范围  
	格式：
		一个数组内的多个可选参数，eg:[1,2,3,4]，["ios","android","all"]
	使用举例：
		"app":{
			"rem":"使用的是什么app",
			"need":true,
			"type":"string",
			"enum":["app","zwapp"]
		}
	2、type：
	作用：
		指定参数类型  
	格式：
		包含的类型有：number,string,object,boolean,array
		eg:
		"type":"string"
		"type":"number"
		"type":"object"
	使用举例：
		"app":{
			"rem":"使用的是什么app",
			"need":true,
			"type":"string",
			"enum":["app","zwapp"]
		}
		表示请求参数为：app,参数类型为string,并且指定app的值一定是 "app"或者"zwapp"


	3、need：
	作用：
		指定参数是否必传  
	格式：
		"need":true
		"need":false
		缺省表示非必传
	使用举例：
		"content": {
			"rem":"内容",
			"need":true,
			"type":"string"
		},


	4、rem：
	作用：
		接口功能描述
	格式：
		"rem":"内容",


	5、len ：长度
	作用：
		1、当type为"string"时，表示指定参数的长度范围
			eg:表示btnName为长度不能小于1，不能大于6的字符类型
			"btnName":{
				"rem":"按钮名字",
				"need":false,//
				"type":"string",
				"len":"[1,6]"
			},
		2、当type为"number"时，表示指定参数的取值范围
			eg:表示id的取值范围在 -1到无穷大
			"id":{//-1表示获取最新消息，也是分页的开始
				"rem":"消息的起始id",
				"need":true,//
				"type":"number",
				"len":[-1,null]
			},
		3、当type为"object"时，表示对象长度范围

		注意：boolean类型没有长度限制
	格式：
		//支持对象，也支持字符串
		"len":"[1,null]",//表示1到正无穷
		"len":[1,null],//表示1到正无穷
		"len":"[null,8)",//表示最大值为8,不包含8
		"len":"[1,8]",//表示值得范围在1到8之间
		"len":"[1,8)",//表示1到8,不包含8
		"len":"(1,8)",//表示1到8,不包含1和8
		"len":"(1,8]",//表示1到8,不包含1
		注意：[],()对null没有实际的作用
}

//错误返回
error:{
	作用：
		标准错误输出，不再通过代码来指定返回内容，同时能够保持错误返回与接口文档一致

	格式：
		"key":"name"

	example:
		"error":{
			"401":"您尚未登录，或者已经在别处登录"
		}
		触发条件：throw Error(401)

	使用方式，通过代码的 throw Error(数字)来返回错误；
}

grant:接口授权
{
	作用：
		直接限定访问接口的一方
	格式：
		grant的值是一个逻辑判断语句的字符串

	example1:
		"grant":"U.fromApp || (U.user5050 && 'employer'==U.user5050.grade)",
		//1、学生可以访问；2、管理后台的employer等级的人才有权访问

	example2:
		"grant":"U.fromApp"
		//1、该接口只允许app端访问；

	example3:
		"grant":"U.user5050 && 'employer'==U.user5050.grade"

	使用方法：
		1、U表示的是登录的session，在koa中是 U = ctx.session;
		grant的内容只要是一句合法的逻辑语句就可以。
}

//该功能暂时未拓展
ret:输出格式化
{
	作用：
		程序通过接口文档ret参数，可以标准输出结果,防止错误返回出现
	example：
		"ret":
		{
			"no": 200, //返回码
			"msg":"出错或成功信息", //成功时可能无此项或为null
			"name":"用户姓名",
			"mail":"用户邮箱",
		}
		接口返回接口完全会按照ret的标准来返回。由于接口返回参数可能存在变动，这里对这一块的定义还有待考量
}



