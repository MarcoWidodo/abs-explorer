import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { BarChart3, TrendingUp, Globe2, GitCompareArrows, ArrowRight } from 'lucide-react'
import { useABSData } from '../context/DataProvider'
import GlobeCanvas from '../components/shared/GlobeCanvas'
import WaveDotMatrix from '../components/shared/WaveDotMatrix'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Single-Wave Explorer',
    desc: 'Browse response distributions for any survey variable, comparing across countries side by side.',
    path: '/explore',
    color: 'var(--chart-1)',
  },
  {
    icon: TrendingUp,
    title: 'Time-Series Explorer',
    desc: 'Track 107 harmonized variables across five waves of surveys spanning two decades.',
    path: '/trends',
    color: 'var(--chart-3)',
  },
  {
    icon: Globe2,
    title: 'Choropleth Map',
    desc: 'Visualize country-level averages across the Asia-Pacific on an interactive map.',
    path: '/map',
    color: 'var(--chart-4)',
  },
  {
    icon: GitCompareArrows,
    title: 'Correlations Explorer',
    desc: 'Analyze relationships between variables at both country and individual levels.',
    path: '/correlations',
    color: 'var(--chart-5)',
  },
]

/* ── Animated number counter ── */
function CountUp({ target, duration = 1.5 }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          function tick(now) {
            const elapsed = (now - start) / (duration * 1000)
            if (elapsed >= 1) {
              setValue(target)
            } else {
              const eased = 1 - Math.pow(1 - elapsed, 3)
              setValue(Math.round(eased * target))
              requestAnimationFrame(tick)
            }
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{value.toLocaleString()}</span>
}

/* ── Main Home component ── */
export default function Home() {
  const navigate = useNavigate()
  const { countryRegistry } = useABSData()
  const heroRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.7], ['0%', '12%'])

  const totalCountries = countryRegistry ? Object.keys(countryRegistry.countries).length : 16

  return (
    <div className="dock-clearance">
      {/* ── Hero with topographic background ── */}
      <section className="hero" ref={heroRef}>
        {/* Topographic contour pattern (pure CSS) */}
        <div className="hero-topo-bg" />

        <motion.div
          className="hero-content"
          style={{ opacity: heroOpacity, y: heroY }}
        >
          {/* Left: text */}
          <div className="hero-text">
            <motion.p
              className="hero-overline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Interactive Data Explorer
            </motion.p>

            <motion.h1
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            >
              Asian Barometer{' '}
              <span className="hero-title-accent">Survey Explorer</span>
            </motion.h1>

            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              Explore two decades of public opinion data across {totalCountries} countries
              in Asia and the Pacific — democratic values, institutional trust,
              political participation, and economic perceptions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6 }}
              style={{ marginTop: '2rem' }}
            >
              <button onClick={() => navigate('/explore')} className="hero-cta">
                Start Exploring
                <ArrowRight size={17} />
              </button>
            </motion.div>

            {/* Stats row */}
            <motion.div
              className="hero-stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.8 }}
            >
              <div className="hero-stat">
                <span className="hero-stat-num"><CountUp target={5} duration={1} /></span>
                <span className="hero-stat-label">Survey Waves</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num"><CountUp target={totalCountries} duration={1.2} /></span>
                <span className="hero-stat-label">Countries</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num"><CountUp target={20} duration={1.4} /></span>
                <span className="hero-stat-label">Years of Data</span>
              </div>
            </motion.div>
          </div>

          {/* Right: globe */}
          <motion.div
            className="hero-globe-wrap"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 1.0, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <GlobeCanvas width={750} height={750} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Wave Coverage: Dot Matrix ── */}
      <section className="wave-section">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.h2
            className="section-heading"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            Five Waves of Data
          </motion.h2>

          <motion.p
            className="section-subheading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            Survey coverage across 16 countries from 2001 to 2021. Hover to explore.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <WaveDotMatrix countryRegistry={countryRegistry} />
          </motion.div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="features-section">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.h2
            className="section-heading"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            Explore the Data
          </motion.h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map(({ icon: Icon, title, desc, path, color }, i) => (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                className="feature-card"
                style={{ '--feature-color': color }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  delay: i * 0.12,
                  duration: 0.6,
                  ease: [0.25, 0.4, 0.25, 1],
                }}
                whileHover={{ y: -6 }}
              >
                <div className="feature-icon">
                  <Icon size={22} />
                </div>
                <div className="feature-title">{title}</div>
                <div className="feature-desc">{desc}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Attribution ── */}
      <motion.section
        className="attribution"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p>
          Data source: The Asian Barometer Survey is coordinated by the
          Institute of Political Science, Academia Sinica, Taipei.
          Visit{' '}
          <a href="https://www.asianbarometer.org" target="_blank" rel="noopener noreferrer">
            asianbarometer.org
          </a>{' '}
          for more information.
        </p>
      </motion.section>
    </div>
  )
}
