
// src/pages/admin/Admin.tsx

import { useState } from "react";
import "./Admin.scss";

export default function Admin() {

  // 当前选中的菜单
  const [active, setActive] = useState("dashboard");

  // ===== 简历假数据 =====
  // TODO: 后续改成后端接口获取
  const resumes = [
    {
      id: 1,
      name: "张三",
      major: "软件工程",
      time: "2026-05-20",
    },
    {
      id: 2,
      name: "李四",
      major: "计算机科学",
      time: "2026-05-19",
    },
  ];

  // ===== 投稿字段配置 =====
  // TODO: 后续从后端获取当前配置
  const [submitFields, setSubmitFields] = useState([
    "姓名",
    "学号",
    "GitHub",
    "PDF简历",
  ]);

  // ===== 活动发布表单 =====
  // TODO: 后续提交到后端接口
  const [activityTitle, setActivityTitle] = useState("");
  const [activityTime, setActivityTime] = useState("");
  const [activityContent, setActivityContent] = useState("");

  // ===== 添加投稿字段 =====
  const addField = () => {
    const field = prompt("请输入新字段");

    if (field && !submitFields.includes(field)) {
      setSubmitFields([...submitFields, field]);
    }
  };

  // ===== 删除投稿字段 =====
  const removeField = (field: string) => {
    setSubmitFields(
      submitFields.filter((item) => item !== field)
    );
  };

  // ===== 发布活动 =====
  const publishActivity = () => {

    // TODO:
    // 后续在这里调用后端接口
    // axios.post("/api/activity", {...})

    alert("活动发布成功（模拟）");

    console.log({
      activityTitle,
      activityTime,
      activityContent,
    });
  };

  // ===== 页面切换 =====
  const renderContent = () => {

    switch (active) {

      // ================= 仪表盘 =================
      case "dashboard":
        return (
          <>
            <section className="cards">

              <div className="card">
                <h3>活动数量</h3>
                <p>12</p>
              </div>

              <div className="card">
                <h3>成员人数</h3>
                <p>86</p>
              </div>

              <div className="card">
                <h3>待审核简历</h3>
                <p>4</p>
              </div>

            </section>

            <section className="panel">
              <h2>系统公告</h2>

              <p>
                欢迎进入社团管理员后台。
              </p>
            </section>
          </>
        );

      // ================= 简历管理 =================
      case "resume":
        return (
          <section className="panel">

            <div className="panel-top">
              <h2>简历管理</h2>
            </div>

            <table>

              <thead>
                <tr>
                  <th>姓名</th>
                  <th>专业</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>

                {
                  resumes.map((item) => (
                    <tr key={item.id}>

                      <td>{item.name}</td>

                      <td>{item.major}</td>

                      <td>{item.time}</td>

                      <td>

                        {/* TODO:
                            后续接简历详情接口
                        */}
                        <button>
                          查看
                        </button>

                        {/* TODO:
                            后续接下载接口
                        */}
                        <button className="danger-btn">
                          下载
                        </button>

                      </td>

                    </tr>
                  ))
                }

              </tbody>

            </table>

          </section>
        );

      // ================= 投稿配置 =================
      case "submit":
        return (
          <section className="panel">

            <div className="panel-top">

              <h2>投稿字段配置</h2>

              <button
                className="main-btn"
                onClick={addField}
              >
                + 添加字段
              </button>

            </div>

            <div className="field-list">

              {
                submitFields.map((field) => (

                  <div
                    className="field-item"
                    key={field}
                  >

                    <span>{field}</span>

                    <button
                      className="danger-btn"
                      onClick={() => removeField(field)}
                    >
                      删除
                    </button>

                  </div>

                ))
              }

            </div>

            {/* TODO:
                后续增加：
                保存配置接口
            */}

          </section>
        );

      // ================= 活动发布 =================
      case "activity":
        return (
          <section className="panel">

            <h2>发布活动</h2>

            <div className="form-group">

              <label>活动标题</label>

              <input
                type="text"
                value={activityTitle}
                onChange={(e) =>
                  setActivityTitle(e.target.value)
                }
              />

            </div>

            <div className="form-group">

              <label>活动时间</label>

              <input
                type="date"
                value={activityTime}
                onChange={(e) =>
                  setActivityTime(e.target.value)
                }
              />

            </div>

            <div className="form-group">

              <label>活动内容</label>

              <textarea
                value={activityContent}
                onChange={(e) =>
                  setActivityContent(e.target.value)
                }
              />

            </div>

            {/* TODO:
                后续增加：
                图片上传接口
                markdown编辑器
            */}

            <button
              className="main-btn"
              onClick={publishActivity}
            >
              发布活动
            </button>

          </section>
        );

      default:
        return <div>暂无内容</div>;
    }
  };

  return (
    <div className="admin-page">

      {/* ===== 左侧导航 ===== */}
      <aside className="admin-sidebar">

        <h2 className="logo">
          社团后台
        </h2>

        <ul className="menu">

          <li
            className={
              active === "dashboard"
                ? "active"
                : ""
            }
            onClick={() => setActive("dashboard")}
          >
            首页
          </li>

          <li
            className={
              active === "resume"
                ? "active"
                : ""
            }
            onClick={() => setActive("resume")}
          >
            简历管理
          </li>

          <li
            className={
              active === "submit"
                ? "active"
                : ""
            }
            onClick={() => setActive("submit")}
          >
            投稿配置
          </li>

          <li
            className={
              active === "activity"
                ? "active"
                : ""
            }
            onClick={() => setActive("activity")}
          >
            活动发布
          </li>

        </ul>

      </aside>

      {/* ===== 主内容 ===== */}
      <main className="admin-content">

        <header className="topbar">

          <h1>管理员控制台</h1>

          <div className="admin-user">
            Admin
          </div>

        </header>

        {renderContent()}

      </main>

    </div>
  );
}
