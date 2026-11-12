import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "@/auth/AuthContext";

export function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState(false);
  const [u, setU] = useState(""); const [p, setP] = useState("");
  if (user) return <Navigate to="/" replace />;
  const submit = (e: FormEvent) => { e.preventDefault(); if (signIn(u, p)) nav("/"); else setError(true); };
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", p: 2 }}>
      <Card sx={{ width: 380 }}><CardContent component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <Typography variant="h5">เข้าสู่ระบบ</Typography>
          <Typography variant="body2" color="text.secondary">Daily Status & Operations Summary</Typography>
          {error && <Alert severity="error">ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง</Alert>}
          <TextField label="ชื่อผู้ใช้" value={u} onChange={(e) => setU(e.target.value)} autoFocus />
          <TextField label="รหัสผ่าน" type="password" value={p} onChange={(e) => setP(e.target.value)} />
          <Button type="submit" variant="contained" size="large">เข้าสู่ระบบ</Button>
          <Typography variant="caption" color="text.secondary">เดโม: admin / admin หรือ csr / csr</Typography>
        </Stack>
      </CardContent></Card>
    </Box>
  );
}
