---
title: CC2430单片机的TinyOS移植（windows平台）
date: '2009-04-23T15:11:16+00:00'
tags:
- 技巧分享
draft: false
legacyDir: 2009-04-23-cc2430e58d95e78987e69cbae79a84tinyose7a7bbe6a48defbc88windowse5b9b3e58fb0efbc89
---



注：如果对CC2430和TinyOS不甚了解，请跳过这篇文章

--

本文发表在PSYcHic

原文地址为：[http://www.darlingtree.com/wordpress/archives/187](http://www.darlingtree.com/wordpress/archives/187) 如需转载请保留这个网址 谢谢！

现在国内做WSN研究的人越来越多了。在硬件方面，我们国内不像国外那样拥有很多硬件开发平台可以供我们选择。而且，crossbow的专业开发平台价格非常昂贵。不过随着越来越多的公司开始关注WSN，zigbee，我们现在还是有可能在千元之内就搭建出来一套自己的无线传感器开发系统。

CC2430是现在较为理想的硬件平台。在国内，大多数人还是使用IAR结合z-stack协议栈（或者是变种的xx龙版）进行开发。z-stack协议栈开发比较简便，很适合新手使用。但是如果你是搞学术研究，需要深入研究组网及相关算法开发的话，那么UC Berkely的TinyOS才是最佳的选择。（我相信聪明的人不会去淌z-stack的OSAL的浑水吧....）

很多人已经成功将TinyOS移植到了CC2430上了。但是目前在网上似乎找不到有比较详细操作步骤的文章。那么我来给大家科普下吧:)

-


## 介绍：


首先，我们要往CC2430上移植的是TinyOS 2.x版本。如果你英文好的话直接前往下面这里查看相关资料[http://tinyos8051wg.sourceforge.net/](http://tinyos8051wg.sourceforge.net/)

TinyOS2.x for 8051目前支持三种编译器——Keil,IAR,sdcc 我们采用的编译器是Keil——这个大家都比较熟悉。TinyOS 2.x 是必须在Linux平台下才能工作的，而Keil则是一个windows下的软件，所以我们必须要先安装一个在windows下面模拟linux的软件——Cygwin。


## 移植前，我们需要准备的东西有：


硬件：CC2430节点，仿真器

软件：Cygwin，Keil，TinyOS 2.x，一些相关的环境设置包，SmartRF04 Flash Programmer

硬件就是原来在IAR下能正常使用的CC2430开发硬件就OK（不管是无线龙的，华凡的，微骨的都行）

软件我需要说下：

TinyOS 2.x : 请到[http://tinyos8051wg.sourceforge.net/download](http://tinyos8051wg.sourceforge.net/download) 这里下载最新版本 （本文是根据[TinyOS8051wg-0.1pre4.tgz](https://sourceforge.net/project/showfiles.php?group_id=254716&package_id=311840&release_id=665013) 26 Oct 2008 这个版本进行的介绍）

Keil:请安装好，记住一定要安装没有2K限制的版本。


## 下面开始安装软件：


0、**安装Kei**l ——Keil是现在单片机开发必备的软件了，网上资料一大堆，我就省略了。自己安装好就可以了。

1、**安装Java 1.5 JDK **

下载地址 [http://java.sun.com](http://java.sun.com)

如果你做Java开发，以前安装过的话就可以跳过这一步了。

2、**安装Cygwin**

请安装TinyOS推荐使用的版本。不少人在后面遇到各种诡异的问题就是因为Cygwin安装不当，缺少一些必要的组件。

你可以去：[http://cone.informatik.uni-freiburg.de/people/aslam/cygwin-files.zip](http://cone.informatik.uni-freiburg.de/people/aslam/cygwin-files.zip)

下载这个版本的Cygwin。

如果链接失效，请前往TinyOS官方的wiki寻找其推荐的Cygwin版本：[http://docs.tinyos.net/index.php/Installing_TinyOS_2.0.2#Manual_installation_on_your_host_OS_with_RPMs](http://docs.tinyos.net/index.php/Installing_TinyOS_2.0.2#Manual_installation_on_your_host_OS_with_RPMs)

安装过程很简单，一路next下去就OK，不过请记住你安装的位置。本文默认是安装到C盘下。

3、**下载TinyOS开发必备的编译工具的安装包（一共4个）**

NesC编译工具：[nesc-1.3.0-1.cygwin.i386.rpm](http://www.tinyos.net/dist-2.1.0/tinyos/windows/nesc-1.3.0-1.cygwin.i386.rpm)

TinyOS相关工具：

[tinyos-deputy-1.1-1.cygwin.i386.rpm](http://www.tinyos.net/dist-2.1.0/tinyos/windows/tinyos-deputy-1.1-1.cygwin.i386.rpm)

[tinyos-tools-1.3.0-1.cygwin.i386.rpm](http://www.tinyos.net/dist-2.1.0/tinyos/windows/tinyos-tools-1.3.0-1.cygwin.i386.rpm)

[tinyos-2.1.0-2.cygwin.noarch.rpm](http://www.tinyos.net/dist-2.1.0/tinyos/windows/tinyos-2.1.0-2.cygwin.noarch.rpm)

4、**启动Cygwin，并在Cygwin下安装上面下载好的rpm包**

双击图标即可启动Cygwin。 正常启动后应该会有"$"标识符和光标。

我们要安装rpm包，就要首先切换到rpm包存放的目录下。如果你熟悉Linux，那么自己安装就行。如果不是的话，按照我所说的一步一步来。

1)首先找到你安装Cygwin的目录，如果是默认安装的话就是C:\Cygwin

2)进入目录，发现里面有/bin /var /etc /opt /home等文件夹，Linux系统下的根目录就是这个样子啦。

我们双击home文件夹，发现里面又有另外一个文件夹，起的是你安装时设置的用户名称，假设你叫做quake（请替换为你自己的用户名）。现在进入C:\Cygwin\home\quake下面

好了，当我们一启动Cygwin，程序的终端窗口默认也是停留在/home/quake下面。下面我们需要把刚刚下载的4个rpm包拷贝到C:\Cygwin\home\quake这个文件夹下面。

之后在Cygwin终端下输入


> ls


按回车后，你会发现终端的窗口里显示了你刚刚拷过去的rpm包的名字。（更多Linux bash命令请参考Linux资料）

下面需要一个一个安装

输入


> rpm -ivh nesc-1.3.0-1.cygwin.i386.rpm
rpm -ivh tinyos-tools-1.3.0-1.cygwin.i386.rpm
rpm -ivh tinyos-deputy-1.1-1.cygwin.i386.rpm
rpm -ivh tinyos-2.1.0-1.cygwin.noarch.rpm


每输入一行，按一次回车，我们就把对应的rpm包给安装好啦。把4个rpm包都安装好后就可以进行下一步了。<!-- more -->

5、**安装TinyOS 2.x**

将下载好的TinyOS 2.x的安装包给解压缩（如TinyOS8051wg-0.1pre4.tgz），解压缩用winrar就可以。

将解压好的tinyos-2.x-contrib这个文件夹拷贝到C:\Cygwin\opt 下

好了。我们已经把TinyOS的开发环境基本搭建好了。

下面我们实际编译个程序吧！

首先在Cygwin下面输入


> cd /opt

ls


你可以看到opt目录下有你刚刚拷贝过去的tinyos-2.x-contrib文件夹，继续输入


> cd tinyos-2.x-contrib/


我们查看下该目录下面有什么


> ls


发现有个diku文件夹

下面输入


> source diku/env


说明：diku文件夹下面有个env配置文件，我们通过source 命令加载下，这样后面编译的时候编译器就知道我们要使用什么样的配置去编译了。关于env配置文件的具体内容稍后介绍。我们用Keil编译，保持其默认状态就可以了。

之后我们就可以编译了，所有的例子在tinyos-2.x-contrib/diku/common/apps/下面，我们以BlinkNoTimerTask为例

输入


> cd /diku/common/apps/BlinkNoTimerTask

make cc2430em


如果一切正常的话，你会看到：


> GENERATING INTEL HEX FILE: app.hex
compiled BlinkNoTimerTaskAppC to a cc2430em binary
Code size of app.o
MODULE INFORMATION:   STATIC OVERLAYABLE
CODE SIZE        =    635    -
CONSTANT SIZE    =   -    -
XDATA SIZE       =      4       9
PDATA SIZE       =   -    -
DATA SIZE        =   -    -
IDATA SIZE       =   -    -
BIT SIZE         =   -    -
Total sizes
Program Size: data=9.0 xdata=10 const=0 code=694


这段话，这表明你已经成功了！~

好了，下面我们看看TinyOS生成了什么吧~

在

**C:\cygwin\opt\tinyos-2.x-contrib\diku\common\apps\BlinkNoTimerTask\build\cc2430em**

这个目录下面

我们发现了其编译生成的app.hex文件。现在只要把这个文件烧录进单片机，我们就大功告成了！


## 烧录


我们安装下SmartRF04 Flash Programmer这个软件，这个软件一般购买仿真器的话都会在附送的光盘里面赠送，如果没有的话网上搜索下吧，实在没有给我发信索取下。

之后我们插好仿真器，打开SmartRF04 Flash Programmer这个软件，在system-on-chip的选项卡下

将hex文件选择为我们刚刚编译好的那个，之后选择“Perform actions”就可以顺利烧写了:)

好了，如果一切正常，那么恭喜你已经将TinyOS成功移植到了CC2430上了。我们成功摆脱了IAR不断升级的困扰和Z-stack，已经进入到了TinyOS的世界了。

欢迎大家继续和我讨论关于TinyOS的相关问题 我的邮箱zzzlog#sogou.com
