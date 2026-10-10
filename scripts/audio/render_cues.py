# gera os sons da landing (síntese em camadas, sem amostras de terceiros)
# uso: python scripts/audio/render_cues.py   (precisa de numpy e lameenc)
import wave
from pathlib import Path

import lameenc
import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parents[2] / "public" / "audio"
rng = np.random.default_rng(2026)


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(SR * seconds)) / SR


def env(t: np.ndarray, start: float, attack: float, decay: float) -> np.ndarray:
    # envelope: sobe linear no ataque e cai exponencial
    x = t - start
    e = np.where(x < 0, 0.0, np.where(x < attack, x / max(attack, 1e-6), np.exp(-(x - attack) / decay)))
    return e


def biquad(signal: np.ndarray, freqs: np.ndarray, q: float, kind: str) -> np.ndarray:
    # filtro RBJ com frequência variando no tempo (lento, mas é offline)
    out = np.zeros_like(signal)
    x1 = x2 = y1 = y2 = 0.0
    for i, x in enumerate(signal):
        w0 = 2 * np.pi * min(freqs[i], SR * 0.45) / SR
        alpha = np.sin(w0) / (2 * q)
        cos = np.cos(w0)
        if kind == "bp":
            b0, b1, b2 = alpha, 0.0, -alpha
        elif kind == "hp":
            b0, b1, b2 = (1 + cos) / 2, -(1 + cos), (1 + cos) / 2
        else:
            b0, b1, b2 = (1 - cos) / 2, 1 - cos, (1 - cos) / 2
        a0, a1, a2 = 1 + alpha, -2 * cos, 1 - alpha
        y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, x, y1, y
        out[i] = y
    return out


def sweep(t: np.ndarray, f_start: float, f_end: float, start: float, length: float) -> np.ndarray:
    k = np.clip((t - start) / length, 0, 1)
    return f_start * (f_end / f_start) ** k


def reverb(signal: np.ndarray, seconds: float, wet: float) -> np.ndarray:
    ir_t = t_axis(seconds)
    ir = rng.standard_normal(ir_t.size) * np.exp(-ir_t / (seconds / 5))
    ir = biquad(ir, np.full(ir.size, 3500.0), 0.7, "lp")
    ir /= np.sqrt(np.sum(ir**2))
    tail = np.convolve(signal, ir)[: signal.size]
    return signal * (1 - wet) + tail * wet


def normalize(signal: np.ndarray, peak_db: float = -1.0) -> np.ndarray:
    return signal / np.max(np.abs(signal)) * 10 ** (peak_db / 20)


def flash_low() -> np.ndarray:
    t = t_axis(1.5)
    hit = 0.045
    noise = rng.standard_normal(t.size)

    # 1) "ar" do teleporte: ruído com banda subindo e descendo
    air_f = np.where(t < hit, sweep(t, 500, 2600, 0, hit), sweep(t, 2600, 450, hit, 0.4))
    air = biquad(noise, air_f, 1.6, "bp") * (env(t, 0.0, hit, 0.16) * 0.9)

    # 2) zap elétrico: laser descendo com FM pra dar textura de faísca
    zap_f = sweep(t, 4200, 180, hit, 0.22)
    phase = 2 * np.pi * np.cumsum(zap_f * (1 + 0.35 * np.sin(2 * np.pi * 63 * t))) / SR
    zap = np.sign(np.sin(phase)) * 0.35 + np.sin(phase) * 0.5
    zap = biquad(zap, np.full(t.size, 900.0), 0.7, "hp") * env(t, hit, 0.002, 0.075) * 0.45

    # 3) estalo do flash: ruído agudo bem curto
    crack = biquad(noise, np.full(t.size, 2500.0), 0.8, "hp") * env(t, hit, 0.001, 0.03) * 0.55

    # 4) faíscas espalhadas que vão rareando
    sparks = np.zeros(t.size)
    for _ in range(46):
        at = hit + rng.exponential(0.16)
        if at > 1.1:
            continue
        i = int(at * SR)
        n = int(SR * rng.uniform(0.002, 0.008))
        burst = rng.standard_normal(n) * np.exp(-np.linspace(0, 6, n)) * rng.uniform(0.12, 0.4)
        sparks[i : i + n] += burst[: max(0, sparks.size - i)]
    sparks = biquad(sparks, np.full(t.size, 3800.0), 1.2, "bp") * 0.9

    # 5) grave: seno com queda de pitch e saturação leve (o "low")
    boom_f = sweep(t, 96, 36, hit, 0.35)
    boom_phase = 2 * np.pi * np.cumsum(boom_f) / SR
    # 2º e 3º harmônicos: o grave aparece até em caixinha de notebook/celular
    boom = np.sin(boom_phase) + 0.35 * np.sin(2 * boom_phase) + 0.15 * np.sin(3 * boom_phase)
    boom = np.tanh(boom * 2.2) * env(t, hit, 0.006, 0.36) * 2.4

    mix = air + zap + crack + sparks + boom
    mix = reverb(mix, 0.9, 0.22)
    fade = np.clip((1.5 - t) / 0.35, 0, 1)
    return normalize(mix * fade, -1.0)


def ui_typing_sprite(variants: int = 6, slot: float = 0.09) -> np.ndarray:
    # sprite com 6 cliques de tecla; o player escolhe um por letra
    out = []
    for v in range(variants):
        t = t_axis(slot)
        noise = rng.standard_normal(t.size)
        tone = 2600 + v * 230 + rng.uniform(-120, 120)
        click = biquad(noise, np.full(t.size, tone), 2.2, "bp") * env(t, 0.0, 0.0008, 0.006)
        thock_f = 210 + v * 14
        thock = np.sin(2 * np.pi * thock_f * t) * env(t, 0.0005, 0.001, 0.012) * 0.35
        release = biquad(noise, np.full(t.size, tone * 1.3), 3.0, "bp") * env(t, 0.038, 0.0006, 0.004) * 0.35
        out.append((click + thock + release) * np.clip((slot - t) / 0.01, 0, 1))
    return normalize(np.concatenate(out), -3.0)


def to_pcm(signal: np.ndarray) -> bytes:
    return (np.clip(signal, -1, 1) * 32767).astype("<i2").tobytes()


def write_mp3(path: Path, signal: np.ndarray, kbps: int = 112) -> None:
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    path.write_bytes(enc.encode(to_pcm(signal)) + enc.flush())


def write_wav(path: Path, signal: np.ndarray, rate: int = 22050) -> None:
    # sprite em wav: sem atraso de encoder, os offsets ficam exatos
    step = SR // rate
    data = to_pcm(signal[::step])
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(data)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    write_mp3(OUT / "cta-globe.mp3", flash_low())
    write_wav(OUT / "ui-typing.wav", ui_typing_sprite())
    for f in OUT.iterdir():
        print(f.name, f.stat().st_size // 1024, "KB")
