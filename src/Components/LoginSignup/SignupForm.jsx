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
      name: "", email: "", gender: "", mobile: "",
      password: "", confirmPassword: "", address: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().min(3, "Must be 3 characters or more").required("Required"),
      email: Yup.string().email("Invalid email address").required("Required"),
      gender: Yup.string().required("Please select a gender"),
      mobile: Yup.string()
        .matches(/^[0-9+\s().-]{7,20}$/, "Enter a valid mobile number")
        .required("Required"),
      password: Yup.string().min(6, "Must be 6 characters or more").required("Required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password"), null], "Passwords do not match")
        .required("Required"),
      address: Yup.string(),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const data = await api("/api/auth/signup", {
          method: "POST",
          body: {
            name: values.name, email: values.email, password: values.password,
            gender: values.gender, mobile: values.mobile,
            address: values.address || null,
          },
        });
        login(data.user, data.token);
        clearCart();
        showToast(`Welcome, ${data.user.name}! Account created.`);
        navigate("/");
      } catch (err) {
        showToast(err.message || "Signup failed. Try again.", "error");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const field = (name) => ({
    name, onChange: formik.handleChange,
    onBlur: formik.handleBlur, value: formik.values[name],
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="loginsignup-fields">
        <div>
          <input type="text" placeholder="Your Name" {...field("name")} />
          {formik.touched.name && formik.errors.name && <div className="error">{formik.errors.name}</div>}
        </div>
        <div>
          <input type="email" placeholder="Email Address" {...field("email")} />
          {formik.touched.email && formik.errors.email && <div className="error">{formik.errors.email}</div>}
        </div>
        <div>
          <select className="loginsignup-select" {...field("gender")}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
          {formik.touched.gender && formik.errors.gender && <div className="error">{formik.errors.gender}</div>}
        </div>
        <div>
          <input type="tel" placeholder="Mobile Number" {...field("mobile")} />
          {formik.touched.mobile && formik.errors.mobile && <div className="error">{formik.errors.mobile}</div>}
        </div>
        <div>
          <input type="password" placeholder="Password" {...field("password")} />
          {formik.touched.password && formik.errors.password && <div className="error">{formik.errors.password}</div>}
        </div>
        <div>
          <input type="password" placeholder="Confirm Password" {...field("confirmPassword")} />
          {formik.touched.confirmPassword && formik.errors.confirmPassword && <div className="error">{formik.errors.confirmPassword}</div>}
        </div>
        <div>
          <input type="text" placeholder="Address (optional)" {...field("address")} />
        </div>
      </div>
      <button type="submit" disabled={formik.isSubmitting}>
        {formik.isSubmitting ? "Creating Account..." : "Sign Up"}
      </button>
    </form>
  );
};

export default SignupForm;
