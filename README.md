> 声明：以JSON格式编写接口文档的方案，是我这边的陈老师给点子。后来个人兴趣，根据他提供的接口文档，写了本框架，以中间件的形式，插入到路由中；为了尊重版权，接口文档的定义大多数都与其同统一。

## 阅读本文条件：
> 1、了解nodejs的express框架的“中间件”和“路由”机制；

> 2、熟悉co-express思想；

## 目标和功能：
依据接口文档定义，调用接口时，在处理业务逻辑之前，对入口参数的进行：
①参数校对；②初步权限检查；③请求参数类型转换；④上传文件时删除非法文件。⑤标准化错误返回；⑥接口访问统计；⑦避免代码逻辑层面反复对接口参数做校验。

## 使用方式：
> 1、在app.js中初始化模块

apiInit(itFaceUrl,itCPath,grantFunc,Debug,fileRoot);//初始化接口校验功能

> 2、以中间件的形式，在需要进行接口请求检测的路由前面使用：

router.use(require('express-api-check').JustifyReq);//从这里开始对以下的接口根据接口文档定义约束请求。

> 3、在路由的结尾使用如下，可根据接口文档定义返回的错误编码，使其标准化错误返回：

router.use(require('express-api-check').onError);

## 初始化参数详解
apiInit(itFaceUrl,itCPath,grantFunc,Debug,fileRoot);
- itFaceUrl：接口文档根路径
- itCPath：接口访问统计文件地址
- grantFunc：接口授权访问的时候,授权未通过时可以进行其余业务逻辑特殊处理 eg:两台独立的系统需要安全访问对方接口时，可以通过用户uid,去服务器判断该用户是否已经登录。 该方法需返回的参数是：①true:授权通过,可以访问接口;②false:授权未通过。没有处理授权特殊情况的，给null。
- Debug：设置为调试模式，则接口文档可以实时更新，生产环境需要设置为false;eg:process.env.NODE_ENV == 'production'? false:true
- fileRoot:上传文件的根目录,不配置的话,采用默认

# 接口文档定义规范：
## 接口文档命名规则：
首先： 多级的子路由为itFaceUrl接口文档根目录下的多级子目录；

文件都是以.json格式出现

eg:![Image](https://github.com/zhuangchuming/express-api-check/blob/master/img/1.jpg)
> json文件命名规则：
1. 路由的最终名字为接口文档的名字。
2. 如果有同名路由，可以使用：路由名+'_'+路由的方法名；eg:①test_POST；②test_DELETE；③test_PATCH等等命名。

    eg:![Image](https://github.com/zhuangchuming/express-api-check/blob/master/img/2.jpeg)

## 接口定义基本数据结构:
    {
        "name":"接口名称",//接口名称
        "url":"/test",//接口调用url，应符合接口定义所在路径
        "method":"POST",//接口调用方式(必需)
        "params"://入口参数定义
        {
          
        },
        "grant":....,//接口权限定义，可使用js伪码
        "check":{....},//接口检查，可使用js伪码
        "error"://接口错误返回定义
        {

        },
        "ret"://接口返回
        {

        }
    }
## 接口定义参数解析
> name : String 接口名称

> url : String 接口url，需注意命名规则

> method : String 接口调用方式(必须定义)，大写,支持的取值： 'POST' | 'GET' | 'HEAD' | 'PUT'|'DELETE'| 'PATCH'等,

> grant : String | Array js伪码，定义权限检查规则，非必需

```
可以使用校验的参数：
1、使用"{S}"作为session的引用。
2、使用"{}"作为请求参数 req.body或req.query的引用。
3、使用"{U}"作为req.session.user的引用，表示用户已经登录；
使用方法：
eg ："grant":"{S}.fromApp"，表示请求需要被设置名为：fromApp 的session。
eg : "grant":"{U} && 3 >= {U}.grade",表示用户必须已经登录（登录后设置user的session），并且用户的grade等级必须不大于3（假设grade=1是最大等级），这个grade是你设置的user对象下的一个参数。
```

> check ：Object | Array js伪码对象，定义条件检查 非必需

```
可以使用校验的参数：
1、使用"{S}"作为session的引用。
2、使用"{}"作为请求参数 req.body或req.query的引用。
3、使用"{U}"作为req.session.user的引用，表示用户已经登录；
使用方法：
eg ：
"check":[
    //不满足R条件,则会返回M消息; {}表示的是请求的数据:req.body || req.query
    {"R":"{}.pwd=={}.pwd1","M":"两次输入的密码不一致，请重新输入"},
    //{U}表示用户必须登录之后,角色必须是admin才能注册 : {U} = req.session.user
    {"R":"{}.type!='admin' || ({U} && {U}.roleName=='admin')","M":"登录管理员才能申请管理员账号"}
]
"check":{"R":"{}.pwd=={}.pwd1","M":"两次输入的密码不一致，请重新输入"},
```


> error : {...}

#### 作用：标准错误输出，不再通过代码来指定返回内容，同时能够保证错误返回与接口文档一致，高效维护接口文档。

eg：

    "error":{
        //默认返回
	    "401":"您尚未登录，或者已经在别处登录",
	    "400":"请求参数有误",
	    "500":"服务器出错",
	    "404":"访问的模板不存在",
	    "403":"您无权访问该接口",
	    //自定义返回
	    "4001":"您已提交，不可重复提交",
	    "5000":"提交次数过多...",
	}
> 触发条件：在接口请求中，通过抛出错误的形式：throw Error(errorkey)

>
    eg: throw Error(4001)
    客户端收到如下：
eg:![Image](https://github.com/zhuangchuming/express-api-check/blob/master/img/3.jpeg)



> params : {...} 入口参数定义，非必需，如未定义或定义为空对象表示无入口参数：

#### params参数
1. rem : String 备注（非必需）
2. lbl : String 异常返回时，代替key的名字
3. need : Boolean 检查该参数是否必须提交
```
need使用举例：
"pwd":{
	"rem":"用户密码",
	"need":true,
	"type":"string",
	"len":[6,18]
},
```
4. reg : String 正则合法检查，定义此参数必须符合的正则表达式
```
使用举例,定义如下两个参数：
"head":{
	"rem":"头像",
	"type":"file",
	"len":"[0,204800]",//不超过200k
	"reg":"/\\.(jpe?g|png|gif)$/"//仅允许jpg,png,gif文件
},
"mail":{
	"rem":"邮箱",
	"type":"string",
	"reg":"/^[^@]+@[^@]+\\.[^@]+$/"
},
```
5. len : String|Array 长度范围定义。
```
作用：控制参数值的长度
支持类型：string,file,array,object

格式如下：支持使用数组和字符串
"len":"[1,null]",//表示1到正无穷
"len":[1,null],//表示1到正无穷
"len":"[null,8)",//表示最大值为8,不包含8
"len":"[1,8]",//表示值得范围在1到8之间
"len":[1,8],//表示1到8
"len":"[1,8)",//表示1到8,不包含8
"len":"(1,8)",//表示1到8,不包含1和8
"len":"(1,8]",//表示1到8,不包含1
注：[],()对null没有实际的作用
1、当参数的type为"string"时，表示指定参数的长度范围
    eg:表示btnName为长度不能小于1，不能大于6的字符类型
	"btnName":{
	    "len":"[1,6]" // [1,6]
	},
    eg:表示btnName为长度不能小于1
	"btnName":{
	    "len":[1,null] // "[1,null]"
	},
2、当参数的type为"object"时，表示对象长度范围
    "person":{//对象的长度大于1，且不大于8
        "len":"(1,8]",
    },
3、当参数的type为"array"时，表示数组长度范围
    "ids":{
        "len":"(1,8]",//表示数组长度大于1，且不大于8
    }
4、当参数的type为"file"时，表示文件的字节数
    "file":{
        "len":[1,1048576]//表示文件长度不大于1M，
    }
	注意：boolean类型没有长度限制
```

6. range : String | Array 取值范围定义
```
支持类型：string,int,float
使用方式与len一致
string类型使用举例：
"account":{
	"lbl":"学生账号",//或者使用rem也可以,如果有lbl和rem,那么错误提示信息,优先使用lbl;
	"rem":"账号",
	"need":true,//必传
	"type":"string",
	"len":"(6,16)",
	"range":["a","z"]//以小写a-z为开头的都可以通过校验, eg: ABC 则会通不过
},
int或者float的使用举例
"height":{
	"rem":"身高",//cm
	"type":"float",
	"range":"(20,null]"//身高不能小于等于20cm以下
},


```

7. type：String类型
>     取值：array数组,object对象（仅content-type:application/json时支持）
,int整型,float浮点,string字符串,json字符串,file文件（仅content-type:multipart/form-data时支持）

8. enum : Array 使用枚举方式定义可能的合法值
```
数组成员应该和type定义的数据类型相同
eg:
"enum":["admin","custom"]
"enum":[1,2,3,4]
使用举例：
"type":{
	"rem":"用户类型",
	"need":true,
	"type":"string",
	"enum":["admin","custom"]//custom：普通用户，admin：管理员
},
```

9.default：任意值
```
使用举例
"sex":{
	"rem":"性别",
	"type":"int",
	"enum":[0,1],//0女，1男
	"default":1 //此处使用默认值,在没有值的情况下,会使用该值
},
```


## 接口文档定义举例：
> POST 提交文件,创建用户信息示例

```
{
	"name":"用户注册",
	"url":"/apiCheck/user/register",
	"method":"POST",
	"params": {
		"account":{
			"lbl":"学生账号",//或者使用rem也可以,如果有lbl和rem,那么错误提示信息,优先使用lbl;
			"rem":"账号",
			"need":true,//必传
			"type":"string",
			"len":"(6,16)",
			"range":["a","z"]//以小写a-z为开头的都可以通过校验, eg: ABC 则会报错
		},
		"pwd":{
			"rem":"用户密码",
			"need":true,
			"type":"string",
			"len":[6,18]
		},
		"pwd1":{
			"rem":"再次确认用户密码",
			"need":true,
			"type":"string",//密码6-18位
			"len":[6,18]
		},
		"type":{
			"rem":"用户类型",
			"need":true,
			"type":"string",
			"enum":["admin","custom"]//custom：普通用户，admin：管理员
		},
		"sex":{
			"rem":"性别",
			"type":"int",
			"enum":[0,1],//0女，1男
			"default":1 //此处使用默认值,在没有值的情况下,会使用该值
		},
		"phone":{
			"rem":"电话号码",
			"type":"string",
			"len":"[11,11]",//11位长度
			"reg":"/^1[3|4|5|7|8][0-9]{9}$/"
		},
		"height":{
			"rem":"身高",//cm
			"type":"float",
			"range":"(20,null]"//身高不能小于等于20cm以下
		},
		"head":{
			"rem":"头像",
			"type":"file",
			"len":"[0,204800]",//不超过200k
			"reg":"/\\.(jpe?g|png|gif)$/"//仅允许jpg,png,gif文件
		},
		"mail":{
			"rem":"邮箱",
			"type":"string",
			"reg":"/^[^@]+@[^@]+\\.[^@]+$/"
		},
		"class":{
			"need":true,//加上这个,如果没有提交class对象,则"need":true时默认设置为空对象:req.body.class ={}
			"cName":{
				"rem":"班级名字",
				"type":"string",
				"len":"[2,null]"
			},
			"grade":{
				"rem":"年级",
				"type":"int",
				"range":[1,12]
			}
		}
	},
	"grant":"{S}",//{S} 为 session对象 req.session
	"check":[
		//不满足R条件,则会返回M消息; {}表示的是请求的数据:req.body || req.query
		{"R":"{}.pwd=={}.pwd1","M":"两次输入的密码不一致，请重新输入"},
		//{U}表示用户必须登录之后,角色必须是admin才能注册 : {U} = req.session.user
		{"R":"{}.type!='admin' || ({U} && {U}.roleName=='admin')","M":"登录管理员才能申请管理员账号"}
	],
	"error"://这里的error值得是ret的no返回码
	{
		"5001":"账号已存在，请使用别的账号"
	},
	"ret":
	{
		"no": 200, //返回码
		"msg":"出错或成功信息", //成功时可能无此项或为null
	}
}
```
其他使用，请查看示例工程：[example](https://github.com/zhuangchuming/express-api-check/tree/master/example) 下面apiCheck接口文档目录。