
export default function CameraLogo({ small = false }) {
  return (
    <span
      className={`camera-logo ${small ? 'small' : ''}`}
      role="img"
      aria-label="CreatorSpace camera C logo"
    >
      <i className="hump" />
      <i className="flash" />
      <i className="c" />
      <b className="lens" />
    </span>
  );
}