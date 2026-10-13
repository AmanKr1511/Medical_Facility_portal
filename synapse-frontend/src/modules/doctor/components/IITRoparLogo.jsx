import logoImg from '../../../assets/iit_ropar_logo.png';

/**
 * Official Indian Institute of Technology Ropar Emblem for OPD Slip.
 */
export default function IITRoparLogo({ size = 88, className = '' }) {
  return (
    <img
      src={logoImg}
      alt="Indian Institute of Technology Ropar Emblem"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        display: 'block',
        width: size,
        height: size,
      }}
      loading="eager"
    />
  );
}
