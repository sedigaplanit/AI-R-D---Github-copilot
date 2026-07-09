import React, { useContext, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { AuthContext } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../Context/ToastContext";
import { ShopContext } from "../../Context/ShopContext";
import api from "../../api/apiClient";
import "./Css/LoginSignup.css";

const LoginForm = () => {
  const { login } = useContext(AuthContext);
  const { loadCartFromAPI } = useContext(ShopContext);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [error, setError] = useState("");

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email address").required("Required"),
      password: Yup.string().min(6, "Must be 6 characters or more").required("Required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: { email: values.email, password: values.password },
        });
        login(data.user, data.token);
        await loadCartFromAPI();
        showToast(`Welcome back, ${data.user.name}!`);
        navigate("/");
      } catch (err) {
        setError(err.message || "Invalid email or password!");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="loginsignup-fields">
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.email}
        />
        {formik.touched.email && formik.errors.email && (
          <div className="error">{formik.errors.email}</div>
        )}

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.password}
        />
        {formik.touched.password && formik.errors.password && (
          <div className="error">{formik.errors.password}</div>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      <button type="submit">Login</button>
    </form>
  );
};

export default LoginForm;
