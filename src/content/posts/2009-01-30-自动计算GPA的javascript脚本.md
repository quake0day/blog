---
title: 自动计算GPA的javascript脚本
date: '2009-01-30T16:18:19+00:00'
tags:
- 作品
draft: false
legacyDir: 2009-01-30-e887aae58aa8e8aea1e7ae97gpae79a84javascripte8849ae69cac
---



哈哈哈哈哈哈哈

忙碌了很长时间，终于把我可爱的自动计算GPA的javascript脚本写好了，用它就可以计算中国农业大学的GPA成绩啦:)

目前只是测试版

它不支持计算：

1、成绩里面有不及格的成绩.... 所以你计算的时候一定要确定你补考都通过了，这样才能计算出来你真实的GPA

2、成绩中含有“中等”以下评价的成绩——因为我最差的也就是“良好”，好不容易知道除了良好还有一个“中等”...但是不知道再往下是什么了，谁要是知道或者得过的更惨的成绩的话..额..是否可以借我密码一用 也算是支持我了。

另外它还没法自定义GPA的点数计算，换算都写死在程序里了，用的是经典的北大算法。

90=4.0，85=3.7，82=3.3，78=3.0，75=2.7，72=2.3，69=2.0，66=1.7，63=1.3，60=1.0。

另外优秀就当是90分 良好就算做85分 中等就算做75分 不过好像不太对...我再慢慢改吧 反正偏差不会超过0.5的

嗯，因为还有这么多的缺陷，所以充其量只能算是一个alpha版本的作品。 本来不想发布了，但是..还是先发上来吧。慢慢完善~

嗯，下面**我要讲解下用法**，虽然是有点复杂吧..不过我觉得应该比用手计算要来的快一些。

1、登陆进入查分系统

2、进到查成绩的页面

3、 按照在图示区域内点击鼠标右键——》选择“查看源文件”，之后会弹出来一个记事本的窗口里面有网页的源文件。

[![e69caae591bde5908d](http://www.darlingtree.com/wordpress/wp-content/uploads/2009/01/e69caae591bde5908d-300x187.jpg)](http://darlingtree.com.fb6i.8-host.com/wordpress/wp-content/uploads/2009/01/e69caae591bde5908d1.jpg)

4、点击文件-》另存为...——》存储到任何一个地方就可以

[![e69caae591bde5908d2](http://www.darlingtree.com/wordpress/wp-content/uploads/2009/01/e69caae591bde5908d2-300x187.jpg)](http://darlingtree.com.fb6i.8-host.com/wordpress/wp-content/uploads/2009/01/e69caae591bde5908d21.jpg)

 

5、OK，马上就要胜利了！ 现在打开[http://www.darlingtree.com/gpa](http://www.darlingtree.com/gpa)

6、上传你刚才另存为的那个成绩文件

7、点击“计算”GPA成绩就会出来了！
