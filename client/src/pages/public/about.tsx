import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, Database, Users, Target, Lightbulb, 
  Building2, Globe, ArrowRight, CheckCircle,
  Network, Award, Microscope
} from "lucide-react";
import qbridgeLogo from "@assets/image_1767775219373.png";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const values = [
  {
    icon: Shield,
    title: "Compliance First",
    description: "Built from the ground up to ensure regulatory compliance across IRB, IBC, and institutional policies"
  },
  {
    icon: Network,
    title: "Interoperability",
    description: "Designed to connect Qatar's research ecosystem with seamless data exchange between institutions"
  },
  {
    icon: Users,
    title: "User-Centered",
    description: "Developed in close collaboration with researchers, administrators, and compliance officers"
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "Leveraging modern technology to streamline research administration and reduce bureaucratic burden"
  }
];

const milestones = [
  { year: "2024", title: "Project Inception", description: "Initial concept developed with key stakeholders" },
  { year: "2025", title: "Beta Development", description: "Core platform built with pilot institution testing" },
  { year: "2026", title: "Multi-Institutional Launch", description: "Expanded to support Sidra, HBKU, and WCM-Q" }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <img src={qbridgeLogo} alt="Q-BRIDGE" className="h-10 w-10" />
              <div>
                <span className="text-xl font-bold text-white">Q-BRIDGE</span>
                <span className="hidden md:inline text-sm text-slate-400 ml-2">Research Governance Ecosystem</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/about" className="text-white font-medium">
                About
              </Link>
              <Link href="/demo" className="text-slate-300 hover:text-white transition-colors">
                Demo
              </Link>
              <Link href="/team" className="text-slate-300 hover:text-white transition-colors">
                Team
              </Link>
              <Link href="/app">
                <Button variant="default" className="bg-teal-600 hover:bg-teal-500">
                  Launch Platform
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </nav>
            <Link href="/app" className="md:hidden">
              <Button size="sm" variant="default" className="bg-teal-600">
                Launch
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24">
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                About Q-BRIDGE
              </h1>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Qatar Biomedical Research Inter-Institutional Data & Governance Ecosystem is a 
                comprehensive platform designed to unify research administration across Qatar's 
                leading biomedical institutions.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="grid md:grid-cols-2 gap-8 mb-20"
            >
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <Target className="h-12 w-12 text-teal-400 mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
                  <p className="text-slate-300 leading-relaxed">
                    To streamline research governance and compliance across Qatar's biomedical 
                    research institutions, enabling scientists to focus on discovery while 
                    ensuring the highest standards of ethical and regulatory compliance.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <Globe className="h-12 w-12 text-blue-400 mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
                  <p className="text-slate-300 leading-relaxed">
                    A unified research ecosystem where collaboration flows seamlessly between 
                    institutions, compliance is automated, and Qatar stands as a global leader 
                    in ethical biomedical research.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-6 bg-slate-800/30">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-white text-center mb-12"
            >
              Our Values
            </motion.h2>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {values.map((value, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="bg-slate-800/50 border-slate-700 h-full hover:border-teal-500/50 transition-colors">
                    <CardContent className="p-6 text-center">
                      <value.icon className="h-10 w-10 text-teal-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                      <p className="text-slate-400 text-sm">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-white text-center mb-12"
            >
              Project Timeline
            </motion.h2>
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-6"
                >
                  <div className="flex-shrink-0 w-20 text-right">
                    <span className="text-teal-400 font-bold text-lg">{milestone.year}</span>
                  </div>
                  <div className="flex-shrink-0 mt-2">
                    <div className="w-3 h-3 bg-teal-500 rounded-full" />
                  </div>
                  <div className="flex-1 pb-8 border-l border-slate-700 pl-6 -ml-[7px]">
                    <h3 className="text-xl font-semibold text-white mb-2">{milestone.title}</h3>
                    <p className="text-slate-400">{milestone.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-gradient-to-r from-teal-900/30 to-blue-900/30">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-white mb-6">
                Ready to Transform Research Governance?
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                Explore the platform demo or connect with our team to learn how Q-BRIDGE 
                can streamline your institution's research administration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/demo">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-500">
                    Explore Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/team">
                  <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                    Meet the Team
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="py-12 px-6 border-t border-slate-800">
          <div className="max-w-7xl mx-auto text-center text-slate-400">
            <p>&copy; 2026 Q-BRIDGE. Qatar Biomedical Research Governance.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
