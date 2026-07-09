import React, { useContext } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { AuthContext } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../Context/ToastContext";
import { ShopContext } from "../../Context/ShopContext";
import api from "../../api/apiClient";
import "./Css/LoginSignup.css";

const SignupForm = () => {
  const { login } = useContext(AuthContext);
  const { clearCart } = useContext(ShopContext);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().min(3, "Must be 3 characters or more").required("Required"),
      email: Yup.string().email("Invalid email address").required("Required"),
      password: Yup.string().min(6, "Must be 6 characters or more").required("Required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const data = await api("/api/auth/signup", {
          method: "POST",
          body: { name: values.name, email: values.email, password: values.password },
        });
        login(data.user, data.token);
        clearCart(); // new user starts with an empty cart
        showToast(`Welcome, ${data.user.name}! Account created.`);
        navigate("/");
      } catch (err) {
        showToast(err.message || "Signup failed. Try again.", "error");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="loginsignup-fields">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.name}
        />
        {formik.touched.name && formik.errors.name && (
          <div className="error">{formik.errors.name}</div>
        )}

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
      <button type="submit">Sign Up</button>
    </form>
  );
};

export default SignupForm;
