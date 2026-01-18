import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Define styles matching ReportPreviewView
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 64,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 32,
    marginBottom: 48,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 16,
  },
  logo: {
    width: 48,
    height: 48,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontStyle: 'italic',
    letterSpacing: 3,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  dateLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  dateValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 16,
  },
  scoreSection: {
    flexDirection: 'row',
    gap: 48,
    paddingVertical: 40,
    paddingHorizontal: 64,
    marginHorizontal: -64,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  scoreItem: {
    flexDirection: 'column',
    gap: 8,
  },
  scoreLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 60,
    color: '#111827',
    fontWeight: 'bold',
  },
  auditorName: {
    fontSize: 20,
    color: '#111827',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  idText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontFamily: 'Courier',
  },
  section: {
    marginTop: 48,
    gap: 32,
  },
  sectionHeader: {
    backgroundColor: '#111827',
    color: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 4,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    paddingBottom: 24,
    marginBottom: 24,
  },
  questionText: {
    flex: 1,
    fontSize: 18,
    color: '#111827',
    fontWeight: 'bold',
    lineHeight: 1.4,
    paddingRight: 48,
  },
  answerBadge: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  answerBadgeNo: {
    backgroundColor: '#EF4444',
  },
})

interface InspectionReportPDFProps {
  template: any
  instance: any
  store: any
  responses: any[]
  overallScore: number
}

export const InspectionReportPDF = ({
  template,
  instance,
  store,
  responses,
  overallScore,
}: InspectionReportPDFProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-GB')
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  const getAnswer = (questionId: string) => {
    const response = responses.find((r: any) => r.question_id === questionId)
    return response?.response_value || response?.response_json || null
  }

  const formatAnswer = (answer: any): string => {
    if (typeof answer === 'string') return answer
    if (typeof answer === 'object' && answer !== null) {
      return answer.value || JSON.stringify(answer)
    }
    return 'UNANSWERED'
  }

  const isPass = (answer: any): boolean => {
    const str = formatAnswer(answer).toLowerCase()
    return str === 'yes' || str === 'y' || str === 'true'
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>SC</Text>
            </View>
            <Text style={styles.title}>INSPECTION REPORT</Text>
            <Text style={styles.subtitle}>
              {store?.store_name || 'Site'} {store?.store_code ? `(${store.store_code})` : ''}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateLabel}>DATE</Text>
            <Text style={styles.dateValue}>
              {formatDate(instance.conducted_at || instance.created_at)}
            </Text>
            <View style={styles.badge}>
              <Text>
                {overallScore >= 90 ? 'CERTIFIED PASS' : 'ISSUES FLAG'}
              </Text>
            </View>
          </View>
        </View>

        {/* Score Section */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{overallScore}%</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Auditor</Text>
            <Text style={styles.auditorName}>
              {instance.conducted_by_user_id ? 'Auditor' : 'Admin User'}
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>ID</Text>
            <Text style={styles.idText}>{instance.id.slice(-8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Sections */}
        {template.sections?.map((section: any) => {
          const sectionQuestions = section.questions || []
          if (sectionQuestions.length === 0) return null

          return (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              {sectionQuestions.map((question: any) => {
                const answer = getAnswer(question.id)
                const answerStr = formatAnswer(answer)
                const passed = isPass(answer)

                return (
                  <View key={question.id} style={styles.questionContainer}>
                    <Text style={styles.questionText}>{question.question_text}</Text>
                    <View style={[styles.answerBadge, !passed && styles.answerBadgeNo]}>
                      <Text>{answerStr.toUpperCase() || 'UNANSWERED'}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
