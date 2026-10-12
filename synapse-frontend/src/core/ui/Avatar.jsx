import { initials } from '../utils/date';
import './ui.css';

export default function Avatar({ name, src, size = 44 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}
